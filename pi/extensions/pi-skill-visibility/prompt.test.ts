import assert from "node:assert/strict";
import test from "node:test";
import { rewriteSkillPrompt, type PromptSkill } from "./prompt.ts";

const skills: PromptSkill[] = [
  { name: "duplicate", filePath: "/a/SKILL.md", disableModelInvocation: false },
  { name: "duplicate", filePath: "/b/SKILL.md", disableModelInvocation: false },
];
const modes = new Map([
  ["/a/SKILL.md", "startup" as const],
  ["/b/SKILL.md", "manual" as const],
]);

const format = (items: PromptSkill[]) => {
  const paths = items.filter((item) => !item.disableModelInvocation).map((item) => item.filePath);
  return paths.length === 0 ? "" : `\n<available_skills>${paths.join(",")}</available_skills>\n`;
};

test("rewrites duplicate names by exact path mode", () => {
  const original = `Header${format(skills)}\nCurrent working directory: /repo`;
  const result = rewriteSkillPrompt(original, skills, modes, format);
  assert.equal(result.systemPrompt, `Header${format([{ ...skills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("inserts Startup skills when source files were Manual", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  const result = rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    modes,
    format,
  );
  assert.equal(result.systemPrompt, `Header${format([{ ...manualSkills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("rewrites Pi's current [Skills] section", () => {
  const namedSkills: PromptSkill[] = [
    { name: "startup", filePath: "/a/SKILL.md", disableModelInvocation: false },
    { name: "manual", filePath: "/b/SKILL.md", disableModelInvocation: false },
  ];
  const namedModes = new Map([
    ["/a/SKILL.md", "startup" as const],
    ["/b/SKILL.md", "manual" as const],
  ]);
  const currentPrompt = "Header\n[Skills]\n  startup, manual\n\nCurrent working directory: /repo";

  const result = rewriteSkillPrompt(currentPrompt, namedSkills, namedModes, format);

  assert.match(result.systemPrompt, /\[Skills\]\n  startup\n/);
  assert.doesNotMatch(result.systemPrompt, /manual/);
});

test("does not insert skills when the read tool is disabled", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    modes,
    format,
    false,
  ), { systemPrompt: "Header\nCurrent working directory: /repo" });
});

test("returns a diagnostic instead of guessing at an unknown prompt shape", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt("Custom prompt", manualSkills, modes, format), {
    systemPrompt: "Custom prompt",
    error: "could not locate Pi's working-directory marker",
  });
});
