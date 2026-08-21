import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "@earendil-works/pi-coding-agent";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectSkillVisibility, type ResolvedProjection } from "./enforcer.ts";
import { readSkillFingerprint } from "./frontmatter.ts";
import {
	runToggleSkillsCommand,
	type ToggleCommandDependencies,
} from "./toggle-command.ts";

const skill = (name: string, filePath: string): Skill => ({
	name,
	description: `${name} description`,
	filePath,
	baseDir: filePath.replace(/\/SKILL\.md$/, ""),
	sourceInfo: {
		path: filePath,
		source: "test-package",
		scope: "user",
		origin: "package",
	},
	disableModelInvocation: false,
});

function context(skills: Skill[], hasUI = true) {
	const notices: Array<[string, string]> = [];
	let reloads = 0;
	return {
		ctx: {
			hasUI,
			mode: hasUI ? "tui" : "print",
			cwd: "/repo",
			getSystemPromptOptions: () => ({ skills }),
			ui: {
				notify: (message: string, level: string) =>
					notices.push([message, level]),
			},
			reload: async () => {
				reloads += 1;
			},
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
		fingerprint: async () => "selector-open-fingerprint",
		project: async () => ({ resolved: [], changed: [], errors: [] }),
		showUi: async () => ({ action: "cancel", drafts: [] }),
		...overrides,
	};
}

test("headless command returns without opening the selector", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")], false);
	let opened = false;
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async () => {
				opened = true;
				return { action: "cancel", drafts: [] };
			},
		}),
	);
	assert.equal(opened, false);
	assert.match(state.notices[0]?.[0] ?? "", /requires interactive Pi/);
});

test("RPC command reports that the picker requires the TUI", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	state.ctx.mode = "rpc";
	let opened = false;

	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async () => {
				opened = true;
				return undefined as never;
			},
		}),
	);

	assert.equal(opened, false);
	assert.match(state.notices[0]?.[0] ?? "", /requires interactive Pi/);
});

test("cancel and no-change save do not write or reload", async () => {
	for (const action of ["cancel", "apply"] as const) {
		const state = context([skill("wiki", "/wiki/SKILL.md")]);
		let writes = 0;
		await runToggleSkillsCommand(
			state.ctx,
			dependencies({
				showUi: async (_ctx, rows) => ({
					action,
					drafts: rows.map((row) => ({
						id: row.id,
						desiredMode: row.savedMode,
					})),
				}),
				writeRegistry: async () => {
					writes += 1;
				},
			}),
		);
		assert.equal(writes, 0);
		assert.equal(state.reloads(), 0);
	}
});

test("apply writes minimal registry, projects, notifies, and reloads once", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	const events: string[] = [];
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async (_ctx, rows) => ({
				action: "apply",
				drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
			}),
			writeRegistry: async (_path, registry) => {
				events.push("write");
				assert.deepEqual(registry.overrides, { "/wiki/SKILL.md": "startup" });
			},
			project: async (affected, expectedFingerprints) => {
				events.push("project");
				assert.equal(affected.length, 1);
				assert.equal(affected[0]?.mode, "startup");
				assert.deepEqual(
					[...expectedFingerprints],
					[["/wiki/SKILL.md", "selector-open-fingerprint"]],
				);
				return { resolved: affected, changed: ["/wiki/SKILL.md"], errors: [] };
			},
		}),
	);
	assert.deepEqual(events, ["write", "project"]);
	assert.equal(state.reloads(), 1);
	assert.match(state.notices.at(-1)?.[0] ?? "", /1 change/);
});

test("empty inventory notifies without opening UI", async () => {
	const state = context([]);
	let opened = false;
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async () => {
				opened = true;
				return { action: "cancel", drafts: [] };
			},
		}),
	);
	assert.equal(opened, false);
	assert.match(state.notices[0]?.[0] ?? "", /No skills found/);
});

test("malformed registry stops before UI", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	let opened = false;
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			readRegistry: async () => {
				throw new Error("registry version must be 1");
			},
			showUi: async () => {
				opened = true;
				return { action: "cancel", drafts: [] };
			},
		}),
	);
	assert.equal(opened, false);
	assert.match(state.notices[0]?.[0] ?? "", /registry version must be 1/);
});

test("registry write failure prevents projection and reload", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	let projected = false;
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async (_ctx, rows) => ({
				action: "apply",
				drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
			}),
			writeRegistry: async () => {
				throw new Error("permission denied");
			},
			project: async () => {
				projected = true;
				return { resolved: [], changed: [], errors: [] };
			},
		}),
	);
	assert.equal(projected, false);
	assert.equal(state.reloads(), 0);
});

test("canonicalization errors are summarized when no usable skills remain", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			resolve: async () => ({
				skills: [],
				errors: [
					{ name: "wiki", path: "/wiki/SKILL.md", message: "broken link" },
				],
			}),
		}),
	);
	assert.match(state.notices[0]?.[0] ?? "", /broken link/);
	assert.equal(state.reloads(), 0);
});

test("projection errors still reload after the registry was saved", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async (_ctx, rows) => ({
				action: "apply",
				drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
			}),
			project: async () => ({
				resolved: [],
				changed: [],
				errors: [
					{ name: "wiki", path: "/wiki/SKILL.md", message: "read-only" },
				],
			}),
		}),
	);
	assert.equal(state.reloads(), 1);
	assert.match(state.notices.at(-1)?.[0] ?? "", /read-only/);
});

test("a skill changed while the selector is open is not overwritten", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-skill-selector-race-"));
	const file = join(dir, "SKILL.md");
	const original =
		"---\nname: wiki\ndescription: Original.\ndisable-model-invocation: true\n---\nBody\n";
	const concurrent =
		"---\nname: wiki\ndescription: Concurrent edit.\ndisable-model-invocation: true\n---\nBody\n";
	const state = context([skill("wiki", file)]);
	let savedIntent: unknown;
	try {
		await writeFile(file, original, "utf8");
		await runToggleSkillsCommand(
			state.ctx,
			dependencies({
				registryPath: () => join(dir, "skill-visibility.json"),
				fingerprint: readSkillFingerprint,
				showUi: async (_ctx, rows) => {
					await writeFile(file, concurrent, "utf8");
					return {
						action: "apply",
						drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
					};
				},
				writeRegistry: async (_path, registry) => {
					savedIntent = registry;
				},
				project: async (affected, expectedFingerprints) =>
					projectSkillVisibility(
						affected as ResolvedProjection[],
						expectedFingerprints,
					),
			}),
		);
		assert.deepEqual(savedIntent, {
			version: 1,
			overrides: { [file]: "startup" },
		});
		assert.equal(await readFile(file, "utf8"), concurrent);
		assert.equal(state.reloads(), 1);
		assert.match(
			state.notices.at(-1)?.[0] ?? "",
			/changed since the selector opened/,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("mixed resolution failures warn with a bounded omitted count and still open", async () => {
	const state = context([skill("wiki", "/wiki/SKILL.md")]);
	let opened = false;
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			resolve: async (skills) => ({
				skills: [
					{
						skill: skills[0]!,
						canonicalPath: skills[0]!.filePath,
						defaultMode: "manual",
						mode: "manual",
					},
				],
				errors: Array.from({ length: 5 }, (_, index) => ({
					name: `broken-${index + 1}`,
					path: `/broken-${index + 1}/SKILL.md`,
					message: `failure-${index + 1}`,
				})),
			}),
			showUi: async () => {
				opened = true;
				return { action: "cancel", drafts: [] };
			},
		}),
	);
	assert.equal(opened, true);
	assert.match(state.notices[0]?.[0] ?? "", /5 skill installations skipped/);
	assert.match(state.notices[0]?.[0] ?? "", /2 more/);
	assert.doesNotMatch(state.notices[0]?.[0] ?? "", /failure-4/);
});

test("source labels cover package, project, temporary, and local skills", async () => {
	const sourceSkills = [
		skill("package", "/package/SKILL.md"),
		skill("project", "/project/SKILL.md"),
		skill("temporary", "/temporary/SKILL.md"),
		skill("local", "/local/SKILL.md"),
	];
	sourceSkills[1]!.sourceInfo = {
		...sourceSkills[1]!.sourceInfo,
		origin: "top-level",
		scope: "project",
	};
	sourceSkills[2]!.sourceInfo = {
		...sourceSkills[2]!.sourceInfo,
		origin: "top-level",
		scope: "temporary",
	};
	sourceSkills[3]!.sourceInfo = {
		...sourceSkills[3]!.sourceInfo,
		origin: "top-level",
		scope: "user",
	};
	const state = context(sourceSkills);
	let labels: string[] = [];
	await runToggleSkillsCommand(
		state.ctx,
		dependencies({
			showUi: async (_ctx, rows) => {
				labels = rows.map((row) => row.sourceLabel);
				return { action: "cancel", drafts: [] };
			},
		}),
	);
	assert.deepEqual(labels, ["test-package", "Project", "Temporary", "Local"]);
});

test("reload is the terminal operation after a changed save", async () => {
	const events: string[] = [];
	let reloaded = false;
	const ctx = {
		hasUI: true,
		mode: "tui",
		getSystemPromptOptions: () => ({
			skills: [skill("wiki", "/wiki/SKILL.md")],
		}),
		ui: {
			notify: () => {
				assert.equal(reloaded, false, "notification ran after reload");
				events.push("notify");
			},
		},
		reload: async () => {
			events.push("reload");
			reloaded = true;
		},
	} as any;
	await runToggleSkillsCommand(
		ctx,
		dependencies({
			showUi: async (_ctx, rows) => ({
				action: "apply",
				drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
			}),
			writeRegistry: async () => {
				assert.equal(reloaded, false);
			},
			project: async () => {
				assert.equal(reloaded, false);
				return { resolved: [], changed: [], errors: [] };
			},
		}),
	);
	assert.deepEqual(events, ["notify", "reload"]);
});
