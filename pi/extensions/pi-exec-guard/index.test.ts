import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import execGuardExtension from "./index.ts";

function register(t: TestContext, enabled?: string, key?: string, additional?: string) {
  const names = ["PI_EXEC_GUARD", "OPENROUTER_API_KEY", "PI_EXEC_GUARD_TOOLS"];
  const previous = names.map(name => process.env[name]);
  for (const [index, value] of [enabled, key, additional].entries()) {
    if (value === undefined) delete process.env[names[index]];
    else process.env[names[index]] = value;
  }
  t.after(() => names.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index];
  }));
  // Only the Pi event boundary is simulated; real guard and HTTP decoder run.
  const handlers = new Map<string, (event: any, ctx: any) => Promise<any>>();
  const tools: { name: string; annotations?: { openWorldHint?: boolean; destructiveHint?: boolean; readOnlyHint?: boolean } }[] = [];
  execGuardExtension({
    on: (name: string, callback: any) => handlers.set(name, callback),
    getAllTools: () => tools,
  } as unknown as ExtensionAPI);
  return { handlers, tools };
}
const context = (hasUI = false) => ({ hasUI, ui: { select: async () => "Deny", notify() {} } });

test("absent or nonexact enable flag registers no handlers or remote calls", t => {
  t.mock.method(globalThis, "fetch", async () => { assert.fail("disabled guard must not use HTTP"); });
  for (const flag of [undefined, "0", "true", "yes", " 1"]) assert.equal(register(t, flag, "key").handlers.size, 0);
});

test("enabled guard registers both execution hooks; missing key blocks instead of disabling", async t => {
  const { handlers } = register(t, "1");
  assert.ok(handlers.has("tool_call") && handlers.has("user_bash"));
  const result = await handlers.get("tool_call")!({ toolName: "bash", input: { command: "ls" } }, context());
  assert.equal(result.block, true);
  assert.match(result.reason, /OPENROUTER_API_KEY/);
  let notice = "";
  await handlers.get("session_start")!({}, { hasUI: true, ui: { notify: (message: string) => { notice = message; } } });
  assert.match(notice, /OPENROUTER_API_KEY/);
});

test("unrelated builtins remain unchanged even without a classifier key", async t => {
  const { handlers } = register(t, "1");
  for (const name of ["read", "edit", "write", "fffind"]) {
    assert.equal(await handlers.get("tool_call")!({ toolName: name, input: {} }, context()), undefined);
  }
});

test("explicit, additional, and annotated network tools are assessed with their full inputs", async t => {
  const { handlers, tools } = register(t, "1", "key", " custom_remote, other ");
  tools.push({ name: "remote_lookup", annotations: { openWorldHint: true, readOnlyHint: true } });
  const sent: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(init.body as string).state);
    return Response.json({ answers: { risk: { type: "choice", choice: "safe", confidence: 1, probabilities: { safe: 0.99, risky: 0.005, uncertain: 0.005 } } } });
  });
  for (const name of ["fetch_content", "custom_remote", "remote_lookup", "mcp__docs__lookup"]) {
    assert.equal(await handlers.get("tool_call")!({ toolName: name, input: { url: "https://example.com/docs" }, parentToolCallId: "outer" }, context()), undefined);
  }
  assert.equal(sent.length, 4);
  assert.deepEqual(sent[0], { toolName: "fetch_content", input: { url: "https://example.com/docs" } });
});

test("user Bash denial replaces execution with a nonzero BashResult; approval passes through", async t => {
  const { handlers } = register(t, "1", "key");
  const result = await handlers.get("user_bash")!({ command: "sudo reboot", excludeFromContext: true }, context(true));
  assert.equal(result.result.exitCode, 1);
  assert.equal(result.result.cancelled, false);
  assert.equal(result.result.truncated, false);
  assert.match(result.result.output, /Denied/);
  assert.equal(await handlers.get("user_bash")!({ command: "sudo reboot" }, { hasUI: true, ui: { select: async () => "Allow once" } }), undefined);
});

test("Pi cancellation reaches fetch and blocks the tool", async t => {
  const { handlers } = register(t, "1", "key");
  const controller = new AbortController();
  let ready!: (signal: AbortSignal) => void;
  const started = new Promise<AbortSignal>(resolve => { ready = resolve; });
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const signal = init.signal as AbortSignal; ready(signal);
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("cancelled")), { once: true }));
  });
  const result = handlers.get("tool_call")!({ toolName: "bash", input: { command: "ls src" } }, { ...context(), signal: controller.signal });
  const httpSignal = await started;
  controller.abort();
  assert.equal((await result).block, true);
  assert.equal(httpSignal.aborted, true);
});
