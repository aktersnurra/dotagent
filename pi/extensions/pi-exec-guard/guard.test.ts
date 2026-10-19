import assert from "node:assert/strict";
import test from "node:test";
import { createGuard, type GuardContext } from "./guard.ts";
import type { Fetch } from "./classifier.ts";

const safeFetch: Fetch = async () => Response.json({ answers: { risk: { type: "choice", choice: "safe", confidence: 1, probabilities: { safe: 0.99, risky: 0.005, uncertain: 0.005 } } } });
const noFetch: Fetch = async () => { assert.fail("must not send a local hazard to OpenRouter"); };
const hazard = () => ({ command: "sudo reboot" });
const harmless = () => ({ command: "ls src" });
const noUI: GuardContext = { hasUI: false, select: async () => { assert.fail("no UI"); } };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

test("local hazards require explicit Allow once, with deny first and complete escaped input", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  for (const choice of ["Allow once", "Deny", undefined, "Yes"]) {
    let prompts = 0;
    const result = await guard("bash", () => ({ command: "sudo reboot # \x1b[31m" }), { hasUI: true, select: async (title, options) => {
      prompts++;
      assert.deepEqual(options, ["Deny", "Allow once"]);
      assert.match(title, /sudo reboot/);
      assert.doesNotMatch(title, /\x1b/);
      return choice;
    } });
    assert.equal(result?.block, choice === "Allow once" ? undefined : true);
    assert.equal(prompts, 1);
  }
});

test("safe noninteractive operations run only at or above the safe probability threshold", async () => {
  for (const [choice, safe, permitted] of [["safe", 0.95, true], ["safe", 0.949, false], ["uncertain", 0.99, false], ["risky", 0.99, false]] as const) {
    const fetch: Fetch = async () => Response.json({ answers: { risk: { type: "choice", choice, confidence: 1, probabilities: { safe, risky: (1-safe)/2, uncertain: (1-safe)/2 } } } });
    const result = await createGuard({ apiKey: "key", fetch })("bash", harmless, noUI);
    assert.equal(result?.block, permitted ? undefined : true);
  }
});

test("risky/uncertain classifications prompt, but classification failures never become approval bypasses", async () => {
  let prompts = 0;
  const ui: GuardContext = { hasUI: true, select: async title => { prompts++; assert.match(title, /uncertain/); return "Allow once"; } };
  const uncertain: Fetch = async () => Response.json({ answers: { risk: { type: "choice", choice: "uncertain", confidence: 0.5, probabilities: { safe: 0.1, risky: 0.1, uncertain: 0.8 } } } });
  assert.equal(await createGuard({ apiKey: "key", fetch: uncertain })("bash", harmless, ui), undefined);
  assert.equal(prompts, 1);
  for (const fetch of [async () => { throw new Error("secret"); }, async () => Response.json({})]) {
    const result = await createGuard({ apiKey: "key", fetch })("bash", harmless, ui);
    assert.equal(result?.block, true);
    assert.doesNotMatch(result!.reason, /secret/);
  }
  assert.equal(prompts, 1);
});

test("array-valued classifier choices block without offering approval", async () => {
  for (const choice of [["safe"], ["risky"], ["uncertain"]]) {
    let prompts = 0;
    const fetch: Fetch = async () => Response.json({ answers: { risk: {
      type: "choice", choice, confidence: 1,
      probabilities: { safe: 0.99, risky: 0.005, uncertain: 0.005 },
    } } });
    const result = await createGuard({ apiKey: "key", fetch })("bash", harmless, {
      hasUI: true,
      select: async () => { prompts++; return "Allow once"; },
    });
    assert.equal(result?.block, true);
    assert.match(result!.reason, /Invalid classifier response/);
    assert.equal(prompts, 0);
  }
});

test("missing credentials block even local hazards and configuration cannot silently disable protection", async () => {
  let prompts = 0;
  const result = await createGuard({ fetch: noFetch })("bash", hazard, { hasUI: true, select: async () => { prompts++; return "Allow once"; } });
  assert.equal(result?.block, true);
  assert.match(result!.reason, /OPENROUTER_API_KEY/);
  assert.equal(prompts, 0);
});

test("invalid/oversized input is blocked without HTTP or UI", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  for (const input of [undefined, {}, { command: "x".repeat(30_000) }]) assert.equal((await guard("bash", () => input, noUI))?.block, true);
});

test("local hazards cannot execute without UI and approvals are not cached", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  assert.equal((await guard("bash", hazard, noUI))?.block, true);
  let prompts = 0;
  const ui: GuardContext = { hasUI: true, select: async () => { prompts++; return "Allow once"; } };
  await guard("bash", hazard, ui);
  await guard("bash", hazard, ui);
  assert.equal(prompts, 2);
});

test("MCP-wrapped file execution always needs approval and never sends input to Jev", async () => {
  const args = { path: "data.txt", language: "python", code: "print(FILE_CONTENT)" };
  const cases: [string, Record<string, unknown>][] = [
    ["mcp", { tool: "ctx_execute_file", args }],
    ["mcp", { tool: "ctx_execute_file", args: JSON.stringify(args) }],
    ["functions.mcp", { tool: "mcp__server__ctx_execute_file", args }],
    ["mcp__server__ctx_execute_file", args],
    ["functions.mcp__server__ctx_execute_file", args],
    ["mcp", { tool: "ctx_execute_file", args: "{invalid" }],
    ["multi_tool_use.parallel", { tool_uses: [
      { recipient_name: "functions.mcp", parameters: { tool: "ctx_execute_file", args } },
    ] }],
  ];
  let requests = 0;
  const fetch: Fetch = async (url, init) => { requests++; return safeFetch(url, init); };
  const guard = createGuard({ apiKey: "key", fetch });
  for (const [tool, input] of cases) {
    assert.equal((await guard(tool, () => input, noUI))?.block, true, tool);
    for (const choice of ["Deny", "Allow once"]) {
      let prompts = 0;
      const result = await guard(tool, () => input, { hasUI: true, select: async title => {
        prompts++;
        assert.ok(title.includes(JSON.stringify({ toolName: tool, input })));
        return choice;
      } });
      assert.equal(prompts, 1, tool);
      assert.equal(result?.block, choice === "Allow once" ? undefined : true, tool);
    }
  }
  assert.equal(requests, 0);
});

test("changed input after remote assessment or approval is blocked", async () => {
  let input = { command: "ls src" };
  const mutate: Fetch = async (url, init) => { input.command = "rm -rf src"; return safeFetch(url, init); };
  assert.equal((await createGuard({ apiKey: "key", fetch: mutate })("bash", () => input, noUI))?.block, true);
  input = hazard();
  const result = await createGuard({ apiKey: "key", fetch: noFetch })("bash", () => input, { hasUI: true, select: async () => { input.command = "sudo shutdown"; return "Allow once"; } });
  assert.equal(result?.block, true);
  assert.match(result!.reason, /changed/);
});

test("parallel calls serialize dialogs and recheck queued inputs before prompting", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  const opened = deferred<void>(), release = deferred<string>();
  let prompts = 0;
  const ui: GuardContext = { hasUI: true, select: async () => { prompts++; opened.resolve(); return release.promise; } };
  const first = guard("bash", hazard, ui);
  await opened.promise;
  const input = hazard();
  const second = guard("bash", () => input, ui);
  input.command = "sudo shutdown";
  release.resolve("Allow once");
  assert.equal(await first, undefined);
  assert.equal((await second)?.block, true);
  assert.equal(prompts, 1);
});

test("cancelled queued approval never opens a dialog and releases permits", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  const opened = deferred<void>(), release = deferred<string>();
  let prompts = 0;
  const ui: GuardContext = { hasUI: true, select: async () => { prompts++; opened.resolve(); return release.promise; } };
  const first = guard("bash", hazard, ui);
  await opened.promise;
  const controller = new AbortController();
  const second = guard("bash", hazard, { ...ui, signal: controller.signal });
  controller.abort();
  assert.equal((await second)?.block, true);
  release.resolve("Allow once");
  assert.equal(await first, undefined);
  assert.equal(prompts, 1);
  assert.equal(await guard("bash", hazard, { hasUI: true, select: async () => "Allow once" }), undefined);
});

test("active dialog cancellation aborts its UI signal and later approvals still work", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  const opened = deferred<AbortSignal>(), controller = new AbortController();
  const running = guard("bash", hazard, { hasUI: true, signal: controller.signal, select: async (_title, _choices, signal) => {
    opened.resolve(signal);
    return new Promise(resolve => signal.addEventListener("abort", () => resolve(undefined), { once: true }));
  } });
  const signal = await opened.promise;
  controller.abort();
  assert.equal((await running)?.block, true);
  assert.equal(signal.aborted, true);
  assert.equal(await guard("bash", hazard, { hasUI: true, select: async () => "Allow once" }), undefined);
});

test("UI failures release the shared semaphore and are sanitized", async () => {
  const guard = createGuard({ apiKey: "key", fetch: noFetch });
  const result = await guard("bash", hazard, { hasUI: true, select: async () => { throw new Error("private"); } });
  assert.equal(result?.block, true);
  assert.doesNotMatch(result!.reason, /private/);
  assert.equal(await guard("bash", hazard, { hasUI: true, select: async () => "Allow once" }), undefined);
});

test("already aborted operations do not call HTTP or open UI", async () => {
  const controller = new AbortController(); controller.abort();
  assert.equal((await createGuard({ apiKey: "key", fetch: noFetch })("bash", harmless, { ...noUI, signal: controller.signal }))?.block, true);
});
