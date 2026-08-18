import assert from "node:assert/strict";
import test from "node:test";
import { enforceSkillVisibility, type SkillIdentity } from "./enforcer.ts";

const skills: SkillIdentity[] = [
  { name: "systematic-debugging", filePath: "/skills/debug/SKILL.md" },
  { name: "ctx-purge", filePath: "/skills/purge/SKILL.md" },
  { name: "ctx-purge-copy", filePath: "/skills/purge-link/SKILL.md" },
];

test("deduplicates canonical paths and applies approved visibility", async () => {
  const writes: Array<[string, boolean]> = [];
  const result = await enforceSkillVisibility(skills, {
    realpath: async (path) => path.includes("purge") ? "/real/purge/SKILL.md" : path,
    writeVisibility: async (path, disabled) => {
      writes.push([path, disabled]);
      return { changed: true };
    },
  });
  assert.deepEqual(writes, [
    ["/skills/debug/SKILL.md", false],
    ["/real/purge/SKILL.md", true],
  ]);
  assert.equal(result.changed.length, 2);
  assert.deepEqual(result.errors, []);
});

test("continues after a per-skill failure", async () => {
  const attempted: string[] = [];
  const result = await enforceSkillVisibility(skills.slice(0, 2), {
    realpath: async (path) => path,
    writeVisibility: async (path) => {
      attempted.push(path);
      if (path.includes("debug")) throw new Error("read-only file system");
      return { changed: true };
    },
  });
  assert.deepEqual(attempted, ["/skills/debug/SKILL.md", "/skills/purge/SKILL.md"]);
  assert.equal(result.changed.length, 1);
  assert.deepEqual(result.errors, [{
    name: "systematic-debugging",
    path: "/skills/debug/SKILL.md",
    message: "read-only file system",
  }]);
});
