import assert from "node:assert/strict";
import test from "node:test";
import { showSkillToggleUi } from "./toggle-overlay.ts";

const rows = [{
  id: "/skills/wiki/SKILL.md",
  name: "wiki",
  description: "Capture knowledge",
  sourceLabel: "Local",
  savedMode: "startup" as const,
}];

test("renders compact labels and returns changed drafts on save", async () => {
  let rendered: string[] = [];
  let renders = 0;
  const result = await showSkillToggleUi({
    ui: {
      custom: async (factory: any) => new Promise((resolve) => {
        const component = factory(
          { terminal: { rows: 24 }, requestRender: () => { renders += 1; } },
          { fg: (_color: string, text: string) => text, bold: (text: string) => text },
          {},
          resolve,
        );
        rendered = component.render(90);
        component.handleInput(" ");
        component.handleInput("s");
      }),
    },
  } as any, rows);

  assert.match(rendered.join("\n"), /Skill visibility/);
  assert.match(rendered.join("\n"), /wiki/);
  assert.match(rendered.join("\n"), /STARTUP/);
  assert.match(rendered.join("\n"), /j\/n down/);
  assert.equal(renders, 1);
  assert.deepEqual(result, {
    action: "apply",
    drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "manual" }],
  });
});
