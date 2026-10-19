import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";

test("real Pi loader imports the extension with dependencies and registers only when enabled", async t => {
  const directory = await mkdtemp(`${tmpdir()}/pi-exec-guard-loader-`);
  const before = process.env.PI_EXEC_GUARD;
  t.after(async () => {
    if (before === undefined) delete process.env.PI_EXEC_GUARD; else process.env.PI_EXEC_GUARD = before;
    await rm(directory, { recursive: true, force: true });
  });
  t.mock.method(globalThis, "fetch", async () => { assert.fail("loading must not make HTTP requests"); });
  for (const enabled of ["0", "1"]) {
    process.env.PI_EXEC_GUARD = enabled;
    const loaded = await discoverAndLoadExtensions([fileURLToPath(new URL("./index.ts", import.meta.url))], directory, directory);
    assert.deepEqual(loaded.errors, []);
    assert.equal(loaded.extensions.length, 1);
    const handlers = loaded.extensions[0].handlers;
    assert.equal(handlers.has("tool_call"), enabled === "1");
    assert.equal(handlers.has("user_bash"), enabled === "1");
  }
});
