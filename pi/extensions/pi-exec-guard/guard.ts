import { Cause, Data, Effect, Exit, Option } from "effect";
import { classifyOperation, ConfigurationError, type Fetch } from "./classifier.ts";
import { escapeDisplay, localRisk, snapshotOperation, type Operation } from "./policy.ts";

class InputError extends Data.TaggedError("InputError") {}
class InputChanged extends Data.TaggedError("InputChanged") {}
class ApprovalError extends Data.TaggedError("ApprovalError") {}

export interface GuardContext {
  hasUI: boolean;
  signal?: AbortSignal;
  select: (title: string, choices: string[], signal: AbortSignal) => Promise<string | undefined>;
}
export type Blocked = { block: true; reason: string };

const messages: Record<string, string> = {
  ConfigurationError: "OPENROUTER_API_KEY is required while PI_EXEC_GUARD=1.",
  TransportError: "Classifier request failed; execution blocked.",
  ClassifierTimeout: "Classifier timed out; execution blocked.",
  ResponseError: "Invalid classifier response; execution blocked.",
  InputError: "Invalid or oversized operation (maximum 24 KiB); execution blocked.",
  InputChanged: "Operation input changed during assessment; execution blocked.",
  ApprovalError: "Approval UI failed; execution blocked.",
};
const block = (reason: string): Blocked => ({ block: true, reason: `Execution guard: ${reason}` });

export function createGuard(options: { apiKey?: string; fetch?: Fetch; timeoutMs?: number }) {
  const approvals = Effect.unsafeMakeSemaphore(1);
  return async (toolName: string, getInput: () => unknown, ctx: GuardContext): Promise<Blocked | undefined> => {
    if (ctx.signal?.aborted) return block("Operation cancelled.");
    const snapshot = () => Effect.try({ try: () => snapshotOperation(toolName, getInput()), catch: () => new InputError() });
    const unchanged = (operation: Operation) => snapshot().pipe(Effect.flatMap(current =>
      current.serialized === operation.serialized ? Effect.void : Effect.fail(new InputChanged())));
    const assess = Effect.gen(function* () {
      if (!options.apiKey?.trim()) return yield* Effect.fail(new ConfigurationError());
      const operation = yield* snapshot();
      let risk = localRisk(operation);
      if (!risk) {
        const decision = yield* classifyOperation(operation, options.apiKey, options);
        yield* unchanged(operation);
        if (decision.choice === "safe" && decision.probabilitySafe >= 0.95) return undefined;
        risk = `Classifier: ${decision.choice} (safe probability ${decision.probabilitySafe.toFixed(3)})`;
      }
      if (!ctx.hasUI) return block("Permission required but no approval UI is available.");
      const title = `Execution/network permission required\n${escapeDisplay(risk)}\nTool: ${escapeDisplay(toolName)}\n${escapeDisplay(operation.serialized)}\nAllow this operation once?`;
      return yield* approvals.withPermits(1)(Effect.gen(function* () {
        yield* unchanged(operation);
        const choice = yield* Effect.tryPromise({
          try: signal => ctx.select(title, ["Deny", "Allow once"], signal),
          catch: () => new ApprovalError(),
        });
        if (choice !== "Allow once") return block("Denied by user.");
        yield* unchanged(operation);
        return undefined;
      }));
    });
    const exit = await Effect.runPromiseExit(assess, { signal: ctx.signal });
    if (Exit.isSuccess(exit)) return exit.value;
    const error = Cause.failureOption(exit.cause);
    if (Option.isSome(error)) return block(messages[error.value._tag] ?? "Assessment failed; execution blocked.");
    return block(Cause.isInterrupted(exit.cause) ? "Operation cancelled." : "Assessment failed; execution blocked.");
  };
}
