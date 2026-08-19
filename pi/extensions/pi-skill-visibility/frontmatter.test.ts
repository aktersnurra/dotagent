/// <reference types="node" />

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  contentFingerprint,
  patchSkillFrontmatter,
  writeSkillVisibility,
} from "./frontmatter.ts";

const body = "\n# Example\n\nKeep this body unchanged.\n";

test("adds manual-only field without changing unrelated bytes", () => {
  const raw = `---\nname: example\ndescription: Example skill.\n---${body}`;
  const result = patchSkillFrontmatter(raw, true);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: `---\nname: example\ndescription: Example skill.\ndisable-model-invocation: true\n---${body}`,
  });
});

test("removes the field for an agent-visible skill", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\ndescription: Example skill.\n---${body}`;
  const result = patchSkillFrontmatter(raw, false);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: `---\nname: example\ndescription: Example skill.\n---${body}`,
  });
});

test("preserves CRLF and an inline comment while changing false to true", () => {
  const raw = "---\r\nname: example\r\ndisable-model-invocation: false # policy\r\n---\r\nBody\r\n";
  const result = patchSkillFrontmatter(raw, true);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: "---\r\nname: example\r\ndisable-model-invocation: true # policy\r\n---\r\nBody\r\n",
  });
});

test("is idempotent when visibility already matches", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: true,
    changed: false,
    content: raw,
  });
});

test("rejects duplicate visibility keys", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\ndisable-model-invocation: false\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: false,
    message: "duplicate disable-model-invocation fields",
  });
});

test("rejects a non-boolean visibility value", () => {
  const raw = `---\nname: example\ndisable-model-invocation: sometimes\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: false,
    message: "disable-model-invocation must be true or false",
  });
});

test("rejects missing closing frontmatter", () => {
  assert.deepEqual(patchSkillFrontmatter("---\nname: example\n", true), {
    ok: false,
    message: "missing closing frontmatter delimiter",
  });
});

test("atomic writer skips unchanged files and persists changed files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-"));
  const file = join(dir, "SKILL.md");
  const raw = `---\nname: example\ndescription: Example.\n---${body}`;
  try {
    await writeFile(file, raw, "utf8");
    const first = await writeSkillVisibility(file, true);
    assert.deepEqual(first, { changed: true });
    const afterFirst = await readFile(file, "utf8");
    assert.match(afterFirst, /disable-model-invocation: true/);
    const second = await writeSkillVisibility(file, true);
    assert.deepEqual(second, { changed: false });
    assert.equal(await readFile(file, "utf8"), afterFirst);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("atomic writer preserves bytes changed after its initial read", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-race-"));
  const file = join(dir, "SKILL.md");
  const raw = `---\nname: example\ndescription: Original.\n---${body}`;
  const concurrent = `---\nname: example\ndescription: Concurrent edit.\n---${body}`;
  try {
    await writeFile(file, raw, "utf8");
    await assert.rejects(
      writeSkillVisibility(file, true, contentFingerprint(raw), {
        beforeReplace: async () => { await writeFile(file, concurrent, "utf8"); },
      }),
      /changed since the popup opened/,
    );
    assert.equal(await readFile(file, "utf8"), concurrent);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
