import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildSavedRegistry,
  parseVisibilityRegistry,
  readVisibilityRegistry,
  RegistryValidationError,
  writeVisibilityRegistry,
} from "./registry.ts";

const empty = { version: 1 as const, overrides: {} };

test("missing registry reads as version 1 with no overrides", async () => {
  assert.deepEqual(await readVisibilityRegistry("/definitely/missing/skill-visibility.json"), empty);
});

test("parser rejects malformed shape and mode", () => {
  assert.throws(() => parseVisibilityRegistry('{"version":2,"overrides":{}}'), RegistryValidationError);
  assert.throws(() => parseVisibilityRegistry('{"version":1,"overrides":{"relative.md":"manual"}}'), RegistryValidationError);
  assert.throws(() => parseVisibilityRegistry('{"version":1,"overrides":{"/x/SKILL.md":"disabled"}}'), RegistryValidationError);
});

test("saved registry keeps only non-default choices for current paths", () => {
  const skills = [
    {
      skill: { name: "jj", filePath: "/links/jj/SKILL.md" },
      canonicalPath: "/real/jj/SKILL.md",
      defaultMode: "startup" as const,
      mode: "manual" as const,
    },
    {
      skill: { name: "wiki", filePath: "/skills/wiki/SKILL.md" },
      canonicalPath: "/skills/wiki/SKILL.md",
      defaultMode: "manual" as const,
      mode: "manual" as const,
    },
  ];
  assert.deepEqual(buildSavedRegistry(skills, new Map<string, "startup" | "manual">([
    ["/real/jj/SKILL.md", "manual"],
    ["/skills/wiki/SKILL.md", "manual"],
    ["/stale/SKILL.md", "startup"],
  ])), {
    version: 1,
    overrides: { "/real/jj/SKILL.md": "manual" },
  });
});

test("writer replaces the registry atomically", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-registry-"));
  const path = join(dir, "skill-visibility.json");
  try {
    await writeFile(path, "old", "utf8");
    await writeVisibilityRegistry(path, {
      version: 1,
      overrides: { "/skills/wiki/SKILL.md": "startup" },
    });
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
      version: 1,
      overrides: { "/skills/wiki/SKILL.md": "startup" },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
