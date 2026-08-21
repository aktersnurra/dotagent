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

test("renders a framed modal and returns changed drafts on save", async () => {
	let rendered: string[] = [];
	let changed: string[] = [];
	let renders = 0;
	let selectedBackgrounds = 0;
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
							{
								...theme,
								bg: (color: string, text: string) => {
									if (color === "selectedBg") selectedBackgrounds += 1;
									return text;
								},
							},
							{},
							resolve,
						);
						component.focused = true;
						rendered = component.render(90);
						component.handleInput(" ");
						changed = component.render(90);
						component.handleInput("s");
					}),
			},
		} as any,
		rows,
	);

	assert.deepEqual(options, {
		overlay: true,
		overlayOptions: {
			anchor: "center",
			width: "92%",
			minWidth: 76,
			maxHeight: "88%",
			margin: 1,
		},
	});
	assert.match(rendered[0] ?? "", /^┌─+┐$/);
	assert.match(rendered[1] ?? "", /^│ .*Skill visibility.*│$/);
	assert.match(rendered.at(-1) ?? "", /^└─+┘$/);
	assert.match(
		rendered.join("\n"),
		/Filter: press \/.*↑↓ move.*space toggle.*s save.*q close/,
	);
	assert.ok(rendered.length <= 14);
	for (const line of rendered) assert.equal(visibleWidth(line), 90);
	assert.match(rendered.join("\n"), /\[✓\] wiki — Capture knowledge/);
	assert.doesNotMatch(rendered.join("\n"), /STARTUP|MANUAL|Local|├/);
	assert.match(changed.join("\n"), /\[ \] wiki \*/);
	assert.doesNotMatch(changed.join("\n"), /STARTUP|MANUAL|Local|├/);
	assert.equal(selectedBackgrounds, 2);
	assert.equal(renders, 1);
	assert.deepEqual(result, {
		action: "apply",
		drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "manual" }],
	});
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

test("renders multiline descriptions as one physical terminal row", async () => {
	let rendered: string[] = [];
	await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any) =>
					new Promise((resolve) => {
						const component = factory(
							{ terminal: { rows: 24 }, requestRender() {} },
							theme,
							{},
							resolve,
						);
						rendered = component.render(120);
						component.handleInput("q");
					}),
			},
		} as any,
		[
			{
				...rows[0]!,
				description:
					"Delegate work in parallel,\nscripted, compatibility-chain workflows.",
			},
		],
	);

	assert.ok(rendered.every((line) => !line.includes("\n")));
	assert.match(
		rendered.join("\n"),
		/Delegate work in parallel, scripted, compatibility-chain workflows\./,
	);
});

test("search edits reset selection to the first matching row", async () => {
	const searchRows = [
		{ ...rows[0]!, id: "/skills/alpha/SKILL.md", name: "alpha" },
		{ ...rows[0]!, id: "/skills/beta/SKILL.md", name: "beta" },
	];
	const selectedRows: string[] = [];
	await showSkillToggleUi(
		{
			ui: {
				custom: async (factory: any) =>
					new Promise((resolve) => {
						const component = factory(
							{ terminal: { rows: 24 }, requestRender() {} },
							{
								...theme,
								bg: (color: string, text: string) => {
									if (color === "selectedBg") selectedRows.push(text);
									return text;
								},
							},
							{},
							resolve,
						);
						component.focused = true;
						component.handleInput("j");
						component.handleInput("/");
						component.handleInput("a");
						component.render(90);
						component.handleInput("\x1b");
						component.handleInput("q");
					}),
			},
		} as any,
		searchRows,
	);

	assert.match(selectedRows.at(-1) ?? "", /\[✓\] alpha/);
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
