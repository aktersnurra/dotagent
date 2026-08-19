import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "@earendil-works/pi-coding-agent";
import { runToggleSkillsCommand, type ToggleCommandDependencies } from "./toggle-command.ts";

const skill = (name: string, filePath: string): Skill => ({
  name,
  description: `${name} description`,
  filePath,
  baseDir: filePath.replace(/\/SKILL\.md$/, ""),
  sourceInfo: { path: filePath, source: "test-package", scope: "user", origin: "package" },
  disableModelInvocation: false,
});

function context(skills: Skill[], hasUI = true) {
  const notices: Array<[string, string]> = [];
  let reloads = 0;
  return {
    ctx: {
      hasUI,
      cwd: "/repo",
      getSystemPromptOptions: () => ({ skills }),
      ui: { notify: (message: string, level: string) => notices.push([message, level]) },
      reload: async () => { reloads += 1; },
    } as any,
    notices,
    reloads: () => reloads,
  };
}

function dependencies(
  overrides: Partial<ToggleCommandDependencies> = {},
): ToggleCommandDependencies {
  return {
    registryPath: () => "/agent/skill-visibility.json",
    readRegistry: async () => ({ version: 1, overrides: {} }),
    writeRegistry: async () => {},
    resolve: async (skills) => ({
      skills: skills.map((item) => ({
        skill: item,
        canonicalPath: item.filePath,
        defaultMode: "manual",
        mode: "manual",
      })),
      errors: [],
    }),
    enforce: async () => ({ resolved: [], changed: [], errors: [] }),
    showUi: async () => ({ action: "cancel", drafts: [] }),
    ...overrides,
  };
}

test("headless command returns without opening the popup", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")], false);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /requires interactive Pi/);
});

test("cancel and no-change save do not write or reload", async () => {
  for (const action of ["cancel", "apply"] as const) {
    const state = context([skill("wiki", "/wiki/SKILL.md")]);
    let writes = 0;
    await runToggleSkillsCommand(state.ctx, dependencies({
      showUi: async (_ctx, rows) => ({
        action,
        drafts: rows.map((row) => ({ id: row.id, desiredMode: row.savedMode })),
      }),
      writeRegistry: async () => { writes += 1; },
    }));
    assert.equal(writes, 0);
    assert.equal(state.reloads(), 0);
  }
});

test("apply writes minimal registry, projects, notifies, and reloads once", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  const events: string[] = [];
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    writeRegistry: async (_path, registry) => {
      events.push("write");
      assert.deepEqual(registry.overrides, { "/wiki/SKILL.md": "startup" });
    },
    enforce: async () => {
      events.push("enforce");
      return { resolved: [], changed: ["/wiki/SKILL.md"], errors: [] };
    },
  }));
  assert.deepEqual(events, ["write", "enforce"]);
  assert.equal(state.reloads(), 1);
  assert.match(state.notices.at(-1)?.[0] ?? "", /1 change/);
});

test("empty inventory notifies without opening UI", async () => {
  const state = context([]);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /No skills found/);
});

test("malformed registry stops before UI", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    readRegistry: async () => { throw new Error("registry version must be 1"); },
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /registry version must be 1/);
});

test("registry write failure prevents projection and reload", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  let projected = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    writeRegistry: async () => { throw new Error("permission denied"); },
    enforce: async () => {
      projected = true;
      return { resolved: [], changed: [], errors: [] };
    },
  }));
  assert.equal(projected, false);
  assert.equal(state.reloads(), 0);
});

test("canonicalization errors are summarized when no usable skills remain", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  await runToggleSkillsCommand(state.ctx, dependencies({
    resolve: async () => ({
      skills: [],
      errors: [{ name: "wiki", path: "/wiki/SKILL.md", message: "broken link" }],
    }),
  }));
  assert.match(state.notices[0]?.[0] ?? "", /broken link/);
  assert.equal(state.reloads(), 0);
});

test("projection errors still reload after the registry was saved", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    enforce: async () => ({
      resolved: [],
      changed: [],
      errors: [{ name: "wiki", path: "/wiki/SKILL.md", message: "read-only" }],
    }),
  }));
  assert.equal(state.reloads(), 1);
  assert.match(state.notices.at(-1)?.[0] ?? "", /read-only/);
});
