import assert from "node:assert/strict";
import test from "node:test";
import { rewriteSkillPrompt, type PromptSkill } from "./prompt.ts";

const skills: PromptSkill[] = [
  { name: "systematic-debugging", disableModelInvocation: false },
  { name: "ctx-purge", disableModelInvocation: false },
];
const visible = new Set(["systematic-debugging"]);
const format = (items: PromptSkill[]) => {
  const names = items.filter((item) => !item.disableModelInvocation).map((item) => item.name);
  return names.length === 0 ? "" : `\n<available_skills>${names.join(",")}</available_skills>\n`;
};

test("replaces Pi's exact current skills block", () => {
  const original = `Header${format(skills)}\nCurrent working directory: /repo`;
  assert.deepEqual(rewriteSkillPrompt(original, skills, visible, format), {
    systemPrompt: `Header${format([{ name: "systematic-debugging", disableModelInvocation: false }])}\nCurrent working directory: /repo`,
  });
});

test("inserts allowlisted skills when all source files were manual-only", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  const original = "Header\nCurrent working directory: /repo";
  const result = rewriteSkillPrompt(original, manualSkills, visible, format);
  assert.equal(result.systemPrompt, `Header${format([{ name: "systematic-debugging", disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("does not insert skills when the read tool is disabled", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    visible,
    format,
    false,
  ), { systemPrompt: "Header\nCurrent working directory: /repo" });
});

test("returns a diagnostic instead of guessing when the prompt shape is unknown", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt("Custom prompt", manualSkills, visible, format), {
    systemPrompt: "Custom prompt",
    error: "could not locate Pi's working-directory marker",
  });
});
