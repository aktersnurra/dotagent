import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { showSkillToggleUi } from "./toggle-selector.ts";

const rows = [
	{
		id: "/skills/wiki/SKILL.md",
		name: "wiki",
		description: "Capture knowledge",
		sourceLabel: "Local",
		savedMode: "startup" as const,
	},
];

const theme = {
	fg: (_color: string, text: string) => text,
	bg: (_color: string, text: string) => text,
	bold: (text: string) => text,
};

test("renders compact labels and returns changed drafts on save", async () => {
	let rendered: string[] = [];
	let changed: string[] = [];
	let renders = 0;
	let options: unknown;
	const result = await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any, customOptions: unknown) =>
					new Promise((resolve) => {
						options = customOptions;
						const component = factory(
							{
								terminal: { rows: 24 },
								requestRender: () => {
									renders += 1;
								},
							},
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
		} as any,
		rows,
	);

	assert.equal(options, undefined);
	assert.match(rendered[0] ?? "", /Skill visibility/);
	assert.match(
		rendered[1] ?? "",
		/Filter: press \/.*↑↓ move.*space toggle.*s save.*q close/,
	);
	assert.ok(rendered.length <= 14);
	for (const line of rendered) assert.equal(visibleWidth(line), 90);
	assert.match(rendered.join("\n"), /Skill visibility/);
	assert.match(rendered.join("\n"), /\[✓\] wiki — Capture knowledge/);
	assert.doesNotMatch(rendered.join("\n"), /STARTUP|MANUAL|Local|├/);
	assert.match(changed.join("\n"), /\[ \] wiki \*/);
	assert.doesNotMatch(changed.join("\n"), /STARTUP|MANUAL|Local|├/);
	assert.equal(renders, 1);
	assert.deepEqual(result, {
		action: "apply",
		drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "manual" }],
	});
});

test("uses Pi's normal custom selector surface instead of an overlay", async () => {
	let options: unknown = "not-called";
	await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any, customOptions: unknown) =>
					new Promise((resolve) => {
						options = customOptions;
						const component = factory(
							{ terminal: { rows: 24 }, requestRender() {} },
							theme,
							{},
							resolve,
						);
						component.handleInput("q");
					}),
			},
		} as any,
		rows,
	);

	assert.equal(options, undefined);
});

test("cancel returns unchanged drafts without requesting another render", async () => {
	let renders = 0;
	const result = await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any) =>
					new Promise((resolve) => {
						const component = factory(
							{
								terminal: { rows: 24 },
								requestRender: () => {
									renders += 1;
								},
							},
							theme,
							{},
							resolve,
						);
						component.handleInput("q");
					}),
			},
		} as any,
		rows,
	);

	assert.equal(renders, 0);
	assert.deepEqual(result, {
		action: "cancel",
		drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "startup" }],
	});
});

test("renders a no-match search state", async () => {
	let rendered: string[] = [];
	let renders = 0;
	await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any) =>
					new Promise((resolve) => {
						const component = factory(
							{
								terminal: { rows: 24 },
								requestRender: () => {
									renders += 1;
								},
							},
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
		} as any,
		rows,
	);

	assert.match(rendered.join("\n"), /Filter: z/);
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
		await showSkillToggleUi(
			{
				ui: {
					custom: async (factory: any) =>
						new Promise((resolve) => {
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
			} as any,
			rows,
		);

		assert.ok(
			rendered.length <= terminalRows,
			`${width}x${terminalRows} exceeded row allocation`,
		);
		for (const line of rendered) {
			assert.ok(
				visibleWidth(line) <= width,
				`${width}x${terminalRows} rendered ${visibleWidth(line)} columns`,
			);
			if (width >= 2 && terminalRows >= 2) {
				assert.equal(
					visibleWidth(line),
					width,
					`${width}x${terminalRows} did not fill its allocated row`,
				);
			}
		}
	}
});

test("keeps the selector within short terminal dimensions", async () => {
	for (let terminalRows = 1; terminalRows <= 8; terminalRows += 1) {
		let rendered: string[] = [];
		await showSkillToggleUi(
			{
				ui: {
					custom: async (factory: any) =>
						new Promise((resolve) => {
							const component = factory(
								{ terminal: { rows: terminalRows }, requestRender() {} },
								theme,
								{},
								resolve,
							);
							rendered = component.render(44);
							component.handleInput("q");
						}),
				},
			} as any,
			rows,
		);

		assert.ok(rendered.length <= terminalRows);
		for (const line of rendered) assert.equal(visibleWidth(line), 44);
	}
});
