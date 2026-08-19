import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { showSkillToggleUi } from "./toggle-overlay.ts";

const rows = [{
  id: "/skills/wiki/SKILL.md",
  name: "wiki",
  description: "Capture knowledge",
  sourceLabel: "Local",
  savedMode: "startup" as const,
}];

const theme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

test("renders compact labels and returns changed drafts on save", async () => {
  let rendered: string[] = [];
  let changed: string[] = [];
  let renders = 0;
  let options: unknown;
  const result = await showSkillToggleUi({
    ui: {
      custom: async (factory: any, customOptions: unknown) => new Promise((resolve) => {
        options = customOptions;
        const component = factory(
          { terminal: { rows: 24 }, requestRender: () => { renders += 1; } },
          theme,
          {},
          resolve,
        );
        rendered = component.render(90);
        component.handleInput(" ");
        changed = component.render(90);
        component.handleInput("s");
      }),
    },
  } as any, rows);

  assert.deepEqual(options, {
    overlay: true,
    overlayOptions: { anchor: "center", width: "82%", maxHeight: "86%", minWidth: 72 },
  });
  assert.match(rendered.join("\n"), /Skill visibility/);
  assert.match(rendered.join("\n"), /wiki/);
  assert.match(rendered.join("\n"), /STARTUP/);
  assert.match(rendered.join("\n"), /j\/n down/);
  assert.match(changed.join("\n"), /wiki \*/);
  assert.match(changed.join("\n"), /MANUAL/);
  assert.equal(renders, 1);
  assert.deepEqual(result, {
    action: "apply",
    drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "manual" }],
  });
});

test("cancel returns unchanged drafts without requesting another render", async () => {
  let renders = 0;
  const result = await showSkillToggleUi({
    ui: {
      custom: async (factory: any) => new Promise((resolve) => {
        const component = factory(
          { terminal: { rows: 24 }, requestRender: () => { renders += 1; } },
          theme,
          {},
          resolve,
        );
        component.handleInput("q");
      }),
    },
  } as any, rows);

  assert.equal(renders, 0);
  assert.deepEqual(result, {
    action: "cancel",
    drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "startup" }],
  });
});

test("renders a no-match search state", async () => {
  let rendered: string[] = [];
  let renders = 0;
  await showSkillToggleUi({
    ui: {
      custom: async (factory: any) => new Promise((resolve) => {
        const component = factory(
          { terminal: { rows: 24 }, requestRender: () => { renders += 1; } },
          theme,
          {},
          resolve,
        );
        component.handleInput("/");
        component.handleInput("z");
        rendered = component.render(90);
        component.handleInput("\x1b");
        component.handleInput("q");
      }),
    },
  } as any, rows);

  assert.match(rendered.join("\n"), /Search: z/);
  assert.match(rendered.join("\n"), /No matching skills/);
  assert.equal(renders, 3);
});

test("bounds every rendered line to the allocated width and terminal rows", async () => {
  const dimensions = [
    { width: 90, terminalRows: 24 },
    { width: 36, terminalRows: 8 },
    { width: 12, terminalRows: 4 },
    { width: 1, terminalRows: 1 },
    { width: 0, terminalRows: 0 },
  ];

  for (const { width, terminalRows } of dimensions) {
    let rendered: string[] = [];
    await showSkillToggleUi({
      ui: {
        custom: async (factory: any) => new Promise((resolve) => {
          const component = factory(
            { terminal: { rows: terminalRows }, requestRender() {} },
            theme,
            {},
            resolve,
          );
          rendered = component.render(width);
          component.handleInput("q");
        }),
      },
    } as any, rows);

    assert.ok(rendered.length <= terminalRows, `${width}x${terminalRows} exceeded row allocation`);
    for (const line of rendered) {
      assert.ok(visibleWidth(line) <= width, `${width}x${terminalRows} rendered ${visibleWidth(line)} columns`);
    }
  }
});
