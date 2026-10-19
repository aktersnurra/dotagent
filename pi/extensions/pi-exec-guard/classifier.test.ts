import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Exit, Cause, Option } from "effect";
import { classifyOperation, type Fetch } from "./classifier.ts";
import { snapshotOperation } from "./policy.ts";

const operation = snapshotOperation("bash", { command: "ls src" });
function response(choice = "safe", safe = 0.97) {
  return { answers: { risk: { type: "choice", choice, confidence: 0.99,
    probabilities: { safe, risky: (1 - safe) / 2, uncertain: (1 - safe) / 2 } } } };
}
const fetchResult = (value: unknown): Fetch => async () => Response.json(value);
async function failureTag(effect: Effect.Effect<unknown, { _tag: string }>) {
  const exit = await Effect.runPromiseExit(effect);
  assert.ok(Exit.isFailure(exit));
  const failure = Cause.failureOption(exit.cause);
  assert.ok(Option.isSome(failure));
  return failure.value._tag;
}

test("uses fixed Decisions API/model and structured untrusted operation without conversation or environment", async () => {
  let calls = 0;
  const fetch: Fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
    assert.equal(init.method, "POST");
    assert.equal(init.redirect, "error", "classifier inputs must not follow a redirect to another endpoint");
    const headers = new Headers(init.headers);
    assert.equal(headers.get("Authorization"), "Bearer test-key");
    assert.equal(headers.get("HTTP-Referer"), "https://github.com/aktersnurra/dotagent");
    assert.equal(headers.get("X-OpenRouter-Title"), "Pi Exec Guard");
    assert.equal(headers.get("X-OpenRouter-App-Visibility"), "hidden");
    const request = JSON.parse(init.body as string);
    assert.equal(request.model, "typesafe/jev-1.13");
    assert.deepEqual(request.state, { toolName: "bash", input: { command: "ls src" } });
    assert.deepEqual(Object.keys(request.questions.risk.criteria).sort(), ["risky", "safe", "uncertain"]);
    assert.equal(request.questions.risk.type, "choice");
    assert.match(request.questions.risk.instructions, /untrusted/i);
    assert.doesNotMatch(init.body as string, /test-key/);
    return Response.json(response());
  };
  assert.deepEqual(await Effect.runPromise(classifyOperation(operation, "test-key", { fetch })), { choice: "safe", probabilitySafe: 0.97 });
  assert.equal(calls, 1);
});

test("returns valid safe, risky, and uncertain probabilities without inventing explanations", async () => {
  for (const choice of ["safe", "risky", "uncertain"] as const) {
    const result = await Effect.runPromise(classifyOperation(operation, "key", { fetch: fetchResult(response(choice, 0.2)) }));
    assert.deepEqual(result, { choice, probabilitySafe: 0.2 });
  }
});

test("rejects malformed and incomplete distributions and confidence values", async () => {
  const valid = response();
  const answer = valid.answers.risk;
  const invalid = [null, {}, { answers: {} },
    { ...answer, choice: "allow" }, { ...answer, type: "text" },
    ...[["safe"], ["risky"], ["uncertain"], null, true, 1, {}].map(choice => ({ ...answer, choice })),
    { ...answer, confidence: NaN }, { ...answer, confidence: 1.1 },
    { ...answer, probabilities: { safe: 1 } },
    { ...answer, probabilities: { safe: -0.1, risky: 0.5, uncertain: 0.6 } },
    { ...answer, probabilities: { safe: 0.97, risky: 0.5, uncertain: 0.5 } },
    { ...answer, probabilities: { safe: "0.97", risky: 0.01, uncertain: 0.02 } },
  ];
  for (const value of invalid) {
    const raw = value && "choice" in value ? { answers: { risk: value } } : value;
    assert.equal(await failureTag(classifyOperation(operation, "key", { fetch: fetchResult(raw) })), "ResponseError");
  }
});

test("missing credentials never call fetch", async () => {
  const fetch: Fetch = async () => { assert.fail("must not call HTTP"); };
  assert.equal(await failureTag(classifyOperation(operation, " ", { fetch })), "ConfigurationError");
});

test("network errors and non-2xx responses are sanitized transport failures", async () => {
  for (const fetch of [async () => { throw new Error("secret bearer token"); }, async () => new Response("secret", { status: 401 })]) {
    assert.equal(await failureTag(classifyOperation(operation, "key", { fetch })), "TransportError");
  }
  assert.equal(await failureTag(classifyOperation(operation, "key", { fetch: async () => new Response("bad json") })), "ResponseError");
});

function stalledFetch(onStarted: (signal: AbortSignal) => void): Fetch {
  return async (_url, init) => {
    const signal = init.signal as AbortSignal;
    onStarted(signal);
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  };
}

test("timeout aborts underlying HTTP request", async () => {
  let signal: AbortSignal | undefined;
  assert.equal(await failureTag(classifyOperation(operation, "key", { fetch: stalledFetch(s => { signal = s; }), timeoutMs: 20 })), "ClassifierTimeout");
  assert.equal(signal?.aborted, true);
});

test("operation cancellation interrupts the effect and aborts HTTP", async () => {
  const controller = new AbortController();
  let started!: (s: AbortSignal) => void;
  const ready = new Promise<AbortSignal>(resolve => { started = resolve; });
  const running = Effect.runPromiseExit(classifyOperation(operation, "key", { fetch: stalledFetch(started) }), { signal: controller.signal });
  const httpSignal = await ready;
  controller.abort();
  const exit = await running;
  assert.ok(Exit.isFailure(exit) && Cause.isInterrupted(exit.cause));
  assert.equal(httpSignal.aborted, true);
});

test("timeout also covers stalled response body consumption", async () => {
  let signal: AbortSignal | undefined;
  const fetch: Fetch = async (_url, init) => {
    signal = init.signal as AbortSignal;
    return new Response(new ReadableStream({ start() {} }));
  };
  assert.equal(await failureTag(classifyOperation(operation, "key", { fetch, timeoutMs: 20 })), "ClassifierTimeout");
  assert.equal(signal?.aborted, true);
});
