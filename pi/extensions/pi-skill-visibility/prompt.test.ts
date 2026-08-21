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
const namedSkills: PromptSkill[] = [
	{ name: "startup", filePath: "/a/SKILL.md", disableModelInvocation: false },
	{ name: "manual", filePath: "/b/SKILL.md", disableModelInvocation: false },
];
const namedModes = new Map([
	["/a/SKILL.md", "startup" as const],
	["/b/SKILL.md", "manual" as const],
]);

const format = (items: PromptSkill[]) => {
	const paths = items
		.filter((item) => !item.disableModelInvocation)
		.map((item) => item.filePath);
	return paths.length === 0
		? ""
		: `\n<available_skills>${paths.join(",")}</available_skills>\n`;
};

const rewrite = (
	systemPrompt: string,
	targetSkills = skills,
	targetModes: ReadonlyMap<string, "startup" | "manual"> = modes,
) =>
	rewriteSkillPrompt({
		systemPrompt,
		skills: targetSkills,
		modesByPath: targetModes,
		formatter: format,
	});

test("rewrites duplicate names by exact path mode", () => {
	const original = `Header${format(skills)}\nCurrent working directory: /repo`;
	const result = rewrite(original);
	assert.equal(
		result.systemPrompt,
		`Header${format([{ ...skills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`,
	);
});

test("replaces Pi's XML catalogue when another extension changed its contents", () => {
	const currentPrompt =
		"Header\n<available_skills>/a/SKILL.md,/b/SKILL.md,/injected/SKILL.md</available_skills>\nCurrent working directory: /repo";

	const result = rewrite(currentPrompt);

	assert.equal(
		result.systemPrompt,
		`Header${format([{ ...skills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`,
	);
	assert.doesNotMatch(
		result.systemPrompt,
		/\/b\/SKILL\.md|\/injected\/SKILL\.md/,
	);
});

test("inserts Startup skills when source files were Manual", () => {
	const manualSkills = skills.map((skill) => ({
		...skill,
		disableModelInvocation: true,
	}));
	const result = rewrite(
		"Header\nCurrent working directory: /repo",
		manualSkills,
	);
	assert.equal(
		result.systemPrompt,
		`Header${format([{ ...manualSkills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`,
	);
});

test("rewrites Pi's current [Skills] section", () => {
	const currentPrompt =
		"Header\n[Skills]\n  startup, manual\n\nCurrent working directory: /repo";

	const result = rewrite(currentPrompt, namedSkills, namedModes);

	assert.match(result.systemPrompt, /\[Skills\]\n {2}startup\n/);
	assert.doesNotMatch(result.systemPrompt, /manual/);
});

test("rewrites Pi's [Skills] section after the working directory", () => {
	const currentPrompt =
		"Header\nCurrent working directory: /repo\n\n[Skills]\n  startup, manual\n\n[Prompts]\n  /deploy";

	const result = rewrite(currentPrompt, namedSkills, namedModes);

	assert.equal(
		result.systemPrompt,
		"Header\nCurrent working directory: /repo\n\n[Skills]\n  startup\n\n[Prompts]\n  /deploy",
	);
});

test("returns a diagnostic instead of guessing at an unknown prompt shape", () => {
	const manualSkills = skills.map((skill) => ({
		...skill,
		disableModelInvocation: true,
	}));
	assert.deepEqual(rewrite("Custom prompt", manualSkills), {
		systemPrompt: "Custom prompt",
		error: "could not locate Pi's working-directory marker",
	});
});
