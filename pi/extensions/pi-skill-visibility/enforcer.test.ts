import assert from "node:assert/strict";
import test from "node:test";
import { enforceSkillVisibility, type SkillIdentity } from "./enforcer.ts";

const skills: SkillIdentity[] = [
  { name: "systematic-debugging", filePath: "/skills/debug/SKILL.md" },
  { name: "ctx-purge", filePath: "/skills/purge/SKILL.md" },
  { name: "ctx-purge-copy", filePath: "/skills/purge-link/SKILL.md" },
];

test("deduplicates canonical paths and projects resolved overrides", async () => {
  const writes: Array<[string, boolean]> = [];
  const result = await enforceSkillVisibility(
    skills,
    { "/real/purge/SKILL.md": "startup", "/skills/debug/SKILL.md": "manual" },
    {
      realpath: async (path) => path.includes("purge") ? "/real/purge/SKILL.md" : path,
      writeVisibility: async (path, disabled) => {
        writes.push([path, disabled]);
        return { changed: true };
      },
    },
  );

  assert.deepEqual(writes, [
    ["/skills/debug/SKILL.md", true],
    ["/real/purge/SKILL.md", false],
  ]);
  assert.deepEqual(result.resolved.map((item) => item.mode), ["manual", "startup"]);
  assert.deepEqual(result.errors, []);
});

test("continues after canonicalization and projection failures", async () => {
  const result = await enforceSkillVisibility(skills.slice(0, 2), {}, {
    realpath: async (path) => {
      if (path.includes("debug")) throw new Error("broken link");
      return path;
    },
    writeVisibility: async () => { throw new Error("read-only file system"); },
  });
  assert.equal(result.resolved.length, 1);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.errors.map((error) => error.message), ["broken link", "read-only file system"]);
});
