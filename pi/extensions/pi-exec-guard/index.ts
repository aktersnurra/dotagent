import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createGuard, type GuardContext } from "./guard.ts";
import { coversOperation } from "./policy.ts";

export default function execGuardExtension(pi: ExtensionAPI) {
  if (process.env.PI_EXEC_GUARD !== "1") return;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const additional = new Set((process.env.PI_EXEC_GUARD_TOOLS ?? "").split(",").map(name => name.trim()).filter(Boolean));
  const guard = createGuard({ apiKey });
  const context = (ctx: ExtensionContext): GuardContext => ({
    hasUI: ctx.hasUI,
    signal: ctx.signal,
    select: (title, choices, signal) => ctx.ui.select(title, choices, { signal }),
  });

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.notify(apiKey?.trim()
      ? "Execution/network guard enabled. Classifier-eligible tool inputs are sent to OpenRouter/TypeSafe."
      : "Execution/network guard enabled but OPENROUTER_API_KEY is missing. Covered operations will be blocked.",
    apiKey?.trim() ? "info" : "warning");
  });

  pi.on("tool_call", async (event, ctx) => {
    const hints = pi.getAllTools().find(tool => tool.name === event.toolName)?.annotations;
    if (!coversOperation(event.toolName, additional, hints)) return;
    return guard(event.toolName, () => event.input, context(ctx));
  });

  pi.on("user_bash", async (event, ctx) => {
    const denied = await guard("bash", () => ({ command: event.command }), context(ctx));
    if (!denied) return;
    return { result: { output: denied.reason, exitCode: 1, cancelled: ctx.signal?.aborted ?? false, truncated: false } };
  });
}
