import assert from "node:assert/strict";
import test from "node:test";
import { resolveSkillInventory } from "./resolver.ts";

const skills = [
  { name: "wiki", filePath: "/links/wiki/SKILL.md" },
  { name: "wiki-copy", filePath: "/links/wiki-copy/SKILL.md" },
  { name: "jj", filePath: "/skills/jj/SKILL.md" },
];

test("exact-path override wins before name default", async () => {
  const result = await resolveSkillInventory(
    skills,
    { "/real/wiki/SKILL.md": "startup", "/skills/jj/SKILL.md": "manual" },
    async (path) => path.includes("wiki") ? "/real/wiki/SKILL.md" : path,
  );

  assert.deepEqual(result.skills.map(({ canonicalPath, defaultMode, mode }) => ({
    canonicalPath,
    defaultMode,
    mode,
  })), [
    { canonicalPath: "/real/wiki/SKILL.md", defaultMode: "manual", mode: "startup" },
    { canonicalPath: "/skills/jj/SKILL.md", defaultMode: "startup", mode: "manual" },
  ]);
  assert.deepEqual(result.errors, []);
});

test("canonicalization failures are isolated", async () => {
  const result = await resolveSkillInventory(skills.slice(0, 2), {}, async (path) => {
    if (path.includes("wiki-copy")) throw new Error("missing target");
    return path;
  });

  assert.equal(result.skills.length, 1);
  assert.deepEqual(result.errors, [{
    name: "wiki-copy",
    path: "/links/wiki-copy/SKILL.md",
    message: "missing target",
  }]);
});
