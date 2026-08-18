import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  formatSkillsForPrompt,
  type ExtensionAPI,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import skillVisibilityExtension from "./index.ts";

test("before_agent_start enforces files and filters the current prompt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-index-"));
  const debuggingPath = join(dir, "debugging.md");
  const wikiPath = join(dir, "wiki.md");
  await writeFile(debuggingPath, "---\nname: systematic-debugging\ndescription: Debug.\ndisable-model-invocation: true\n---\n", "utf8");
  await writeFile(wikiPath, "---\nname: wiki\ndescription: Wiki.\n---\n", "utf8");

  let handler: ((event: any, ctx: any) => Promise<{ systemPrompt: string }>) | undefined;
  const pi = {
    on(event: string, registered: typeof handler) {
      assert.equal(event, "before_agent_start");
      handler = registered;
    },
  } as unknown as ExtensionAPI;

  const skill = (name: string, filePath: string, disabled: boolean): Skill => ({
    name,
    description: name,
    filePath,
    baseDir: dir,
    sourceInfo: { path: filePath, source: "test", scope: "user", origin: "top-level" },
    disableModelInvocation: disabled,
  });
  const skills = [
    skill("systematic-debugging", debuggingPath, true),
    skill("wiki", wikiPath, false),
  ];

  try {
    skillVisibilityExtension(pi);
    assert.ok(handler);
    const originalPrompt = `Header${formatSkillsForPrompt(skills)}\nCurrent working directory: /repo`;
    const result = await handler({
      systemPrompt: originalPrompt,
      systemPromptOptions: { skills, selectedTools: ["read"] },
    }, { ui: { notify() {} } });

    assert.match(result.systemPrompt, /<name>systematic-debugging<\/name>/);
    assert.doesNotMatch(result.systemPrompt, /<name>wiki<\/name>/);
    assert.doesNotMatch(await readFile(debuggingPath, "utf8"), /disable-model-invocation/);
    assert.match(await readFile(wikiPath, "utf8"), /disable-model-invocation: true/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
