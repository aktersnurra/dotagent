# `/toggle-skills` Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore `/toggle-skills` as a centered floating popup whose complete visible frame prevents its checklist rows from visually merging with transcript content.

**Architecture:** Keep `ToggleModel` and the command/data flow unchanged. Restore overlay options in `showSkillToggleUi()`, then pass the existing body lines through a small `SkillToggleFrame` renderer that owns exact-width borders, padding, and constrained-height behavior without applying per-line backgrounds.

**Tech Stack:** TypeScript 5.9, Node.js test runner, `@earendil-works/pi-coding-agent` 0.84.2, `@earendil-works/pi-tui` 0.84.2, Jujutsu.

## Global Constraints

- `/toggle-skills` must render as a centered floating overlay, never an inline custom surface.
- The overlay must have a visible, complete rectangular frame.
- Every interior row must occupy the full inner width so transcript characters cannot survive inside the frame.
- Preserve the compact checklist and all existing search, navigation, toggle, save, and cancel controls.
- Preserve `ToggleModel`, command, registry, projection, fingerprint, reload, and RPC-guard behavior.
- Do not use per-line `theme.bg("customMessageBg", ...)` styling.
- Mocked `ctx.ui.custom()` tests and isolated tmux captures are not visual acceptance evidence.
- Do not claim the rendering is fixed until the user confirms it in the actual Pi session.
- Touch only `pi/extensions/pi-skill-visibility/toggle-overlay.ts` and `pi/extensions/pi-skill-visibility/toggle-overlay.test.ts` for implementation.

## File Structure

- Modify `pi/extensions/pi-skill-visibility/toggle-overlay.ts`: restore overlay invocation, add the frame renderer, and account for border rows in sizing.
- Modify `pi/extensions/pi-skill-visibility/toggle-overlay.test.ts`: specify the overlay contract, rectangular frame invariants, compositor replacement behavior, and constrained-terminal behavior.
- Do not modify `pi/extensions/pi-skill-visibility/toggle-model.ts`: it remains the sole interaction-state model.
- Do not modify `pi/extensions/pi-skill-visibility/toggle-command.ts` or its test: the existing RPC guard and command behavior remain unchanged.

---

### Task 1: Restore the framed floating popup

**Files:**

- Modify: `pi/extensions/pi-skill-visibility/toggle-overlay.ts:1-160`
- Test: `pi/extensions/pi-skill-visibility/toggle-overlay.test.ts:1-173`

**Interfaces:**

- Consumes: `ToggleModel`, `ToggleRow`, `ToggleDraft`, `Theme`, `TUI`, `truncateToWidth()`, and `visibleWidth()`.
- Produces: unchanged `showSkillToggleUi(ctx, rows): Promise<SkillToggleUiResult>` behavior, now invoked with overlay options.
- Produces internally: `SkillToggleFrame.render(lines: string[], width: number, height: number): string[]`, which returns a bounded exact-width rectangle whenever both dimensions are at least two cells.

- [ ] **Step 1: Update the test imports for compositor-level assertions**

Replace the existing `@earendil-works/pi-tui` import in `toggle-overlay.test.ts` with:

```ts
import {
	compositeTuiLine,
	sliceByColumn,
	stripTerminalSequences,
	visibleWidth,
} from "@earendil-works/pi-tui";
```

- [ ] **Step 2: Make the existing save test require floating overlay options and a complete frame**

In `renders compact labels and returns changed drafts on save`, replace `assert.equal(options, undefined);` with the overlay contract and frame assertions:

```ts
	assert.deepEqual(options, {
		overlay: true,
		overlayOptions: {
			anchor: "center",
			width: "64%",
			maxHeight: "70%",
			minWidth: 44,
		},
	});
	assert.equal(rendered[0], `╭${"─".repeat(88)}╮`);
	assert.equal(rendered.at(-1), `╰${"─".repeat(88)}╯`);
	for (const line of rendered.slice(1, -1)) {
		assert.equal(line.startsWith("│"), true);
		assert.equal(line.endsWith("│"), true);
		assert.equal(visibleWidth(line), 90);
	}
```

Keep the existing assertions for title, checklist copy, changed drafts, render count, and returned result. Change the chrome exclusion assertions so they still reject the old internal dividers but allow the selected outer frame:

```ts
	assert.doesNotMatch(rendered.join("\n"), /STARTUP|MANUAL|Local|├/);
	assert.doesNotMatch(changed.join("\n"), /STARTUP|MANUAL|Local|├/);
```

- [ ] **Step 3: Add a failing compositor regression test**

Append this test after the width/height test:

```ts
test("replaces transcript cells throughout the framed overlay rectangle", async () => {
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
						rendered = component.render(44);
						component.handleInput("q");
					}),
			},
		} as any,
		rows,
	);

	const totalWidth = 70;
	const startCol = 9;
	const baseLine = "~".repeat(totalWidth);
	for (const overlayLine of rendered) {
		const composite = compositeTuiLine(
			baseLine,
			overlayLine,
			startCol,
			44,
			totalWidth,
		);
		const inside = stripTerminalSequences(
			sliceByColumn(composite, startCol, 44, true),
		);
		assert.equal(visibleWidth(inside), 44);
		assert.doesNotMatch(inside, /~/);
	}
});
```

This test is deliberately limited to compositor semantics. It must not be cited as proof of terminal appearance.

- [ ] **Step 4: Run the focused test and verify the red state**

Run from `pi/extensions/pi-skill-visibility`:

```sh
node --test toggle-overlay.test.ts
```

Expected: FAIL because `showSkillToggleUi()` supplies no overlay options and rendered output has no `╭…╮`, `│…│`, or `╰…╯` frame.

- [ ] **Step 5: Restore the floating overlay invocation**

Replace `showSkillToggleUi()` in `toggle-overlay.ts` with:

```ts
export function showSkillToggleUi(
	ctx: ExtensionCommandContext,
	rows: ToggleRow[],
): Promise<SkillToggleUiResult> {
	return ctx.ui.custom<SkillToggleUiResult>(
		(tui, theme, _keybindings, done) =>
			new SkillToggleOverlay(tui, theme, rows, done),
		{
			overlay: true,
			overlayOptions: {
				anchor: "center",
				width: "64%",
				maxHeight: "70%",
				minWidth: 44,
			},
		},
	);
}
```

- [ ] **Step 6: Add the dedicated exact-width frame renderer**

Add this class immediately before `SkillToggleOverlay`:

```ts
class SkillToggleFrame {
	private readonly theme: Theme;

	constructor(theme: Theme) {
		this.theme = theme;
	}

	render(lines: string[], width: number, height: number): string[] {
		const frameWidth = Math.max(0, Math.floor(width));
		const frameHeight = Math.max(0, Math.floor(height));
		if (frameWidth === 0 || frameHeight === 0) return [];

		const border = (text: string) => this.theme.fg("border", text);
		if (frameWidth === 1) {
			return Array.from({ length: frameHeight }, () => border("│"));
		}
		if (frameHeight === 1) return [border("─".repeat(frameWidth))];

		const innerWidth = frameWidth - 2;
		const innerHeight = frameHeight - 2;
		const body = pad(
			lines.map((line) => fit(line, innerWidth)),
			innerHeight,
		);
		return [
			border(`╭${"─".repeat(innerWidth)}╮`),
			...body.map(
				(line) => `${border("│")}${fit(line, innerWidth)}${border("│")}`,
			),
			border(`╰${"─".repeat(innerWidth)}╯`),
		];
	}
}
```

This class uses only foreground border styling. It does not call `theme.bg()`.

- [ ] **Step 7: Make `SkillToggleOverlay` own the frame renderer**

Add the field:

```ts
	private readonly frame: SkillToggleFrame;
```

In the constructor, after assigning `this.done`, add:

```ts
		this.frame = new SkillToggleFrame(theme);
```

- [ ] **Step 8: Replace `SkillToggleOverlay.render()` so border rows count toward the height budget**

Replace the method with:

```ts
	render(width: number): string[] {
		const renderWidth = Math.max(0, Math.floor(width));
		const terminalRows = Math.max(0, Math.floor(this.tui.terminal.rows ?? 30));
		if (renderWidth === 0 || terminalRows === 0) return [];

		const height = Math.min(
			terminalRows,
			clamp(Math.floor(terminalRows * 0.7), 6, 32),
		);
		const innerWidth = Math.max(0, renderWidth - 2);
		const innerHeight = Math.max(0, height - 2);
		if (renderWidth < 36 || terminalRows < 8) {
			return this.frame.render(
				this.degraded(innerWidth, innerHeight),
				renderWidth,
				height,
			);
		}

		const bodyHeight = innerHeight - 3;
		const header = this.header(innerWidth);
		const search =
			this.model.mode === "search"
				? this.theme.fg("accent", `Search: ${this.model.query}▏`)
				: this.theme.fg(
						"muted",
						`Search: ${this.model.query || "press /"}`,
					);
		const body = this.rows(innerWidth, bodyHeight);
		const footer = this.theme.fg(
			"dim",
			"j/n down · k/e up · / search · space toggle · s save · q quit",
		);

		return this.frame.render(
			[header, search, ...body, footer],
			renderWidth,
			height,
		);
	}
```

Do not change `handleInput()`, `header()`, `rows()`, `fit()`, `pad()`, or `clamp()` except where the new width/height inputs naturally flow through them.

- [ ] **Step 9: Strengthen the constrained-dimensions test without claiming impossible frames**

Inside `bounds every rendered line to the allocated width and terminal rows`, retain the existing `rendered.length <= terminalRows` assertion and replace the per-line assertion with:

```ts
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
```

For a one-column or one-row terminal, the renderer remains bounded but cannot draw four distinct corners; those cases must not be described as complete frames.

- [ ] **Step 10: Run the focused test and verify green**

Run from `pi/extensions/pi-skill-visibility`:

```sh
node --test toggle-overlay.test.ts
```

Expected: all `toggle-overlay.test.ts` tests PASS, including overlay options, frame invariants, interactions, constrained dimensions, and compositor replacement.

- [ ] **Step 11: Run proactive diagnostics on the edited files**

Run `lsp_diagnostics` with:

```json
{
  "paths": [
    "pi/extensions/pi-skill-visibility/toggle-overlay.ts",
    "pi/extensions/pi-skill-visibility/toggle-overlay.test.ts"
  ],
  "severity": "all",
  "serverScope": "primary"
}
```

Expected: no TypeScript errors. Fix only diagnostics caused by these edits.

- [ ] **Step 12: Run the extension suite and typecheck**

Run from `pi/extensions/pi-skill-visibility`:

```sh
npm test
npm run typecheck
```

Expected: the complete test suite passes and `tsc --noEmit` exits successfully.

- [ ] **Step 13: Commit only the popup implementation and regression tests**

Because the working copy already contains unrelated changes, split only the two overlay files:

```sh
jj split \
  pi/extensions/pi-skill-visibility/toggle-overlay.ts \
  pi/extensions/pi-skill-visibility/toggle-overlay.test.ts \
  -m "fix(pi): render skill toggle as framed popup"
```

Expected: the selected commit contains only those two files; the RPC guard and unrelated skill-file changes remain in the working-copy revision.

---

### Task 2: Verify the actual Pi-session rendering

**Files:**

- Modify: none unless actual-session evidence reveals a reproducible defect
- Test: the user's live Pi session over existing transcript content

**Interfaces:**

- Consumes: the installed `pi-skill-visibility` extension symlink and the framed popup from Task 1.
- Produces: user-confirmed visual acceptance, or concrete screenshot evidence that returns the work to a new red-green cycle.

- [ ] **Step 1: Confirm automated verification remains current**

Record the exact passing outputs from:

```sh
cd pi/extensions/pi-skill-visibility
npm test
npm run typecheck
```

Also run `lens_diagnostics` in `mode: "all"` restricted to the two edited overlay files. Expected: no blocking errors.

- [ ] **Step 2: Ask the user to exercise the actual installed extension**

Ask the user to perform these exact steps in the active Pi TUI:

```text
/reload
/toggle-skills
```

The popup must be opened over real transcript content, not an empty isolated terminal.

- [ ] **Step 3: Require live or screenshot confirmation**

Ask the user to confirm all four visible properties:

1. A centered floating popup is present.
2. All four sides of the frame are continuous and aligned.
3. Transcript text remains only outside the frame and does not visually merge with checklist rows.
4. Search, movement, toggle, save, and quit hints remain readable.

Expected: the user explicitly confirms the live rendering or supplies a screenshot showing these properties.

- [ ] **Step 4: Stop rather than guessing if visual confirmation fails**

If the user reports corruption, do not stack another styling attempt onto the implementation. Save the screenshot path and exact terminal dimensions, add one failing regression test for the newly observed mechanism where automatable, then return to systematic root-cause investigation before editing production code.

If the user confirms the popup is clean, report completion with both automated command evidence and the user's actual-session confirmation. Do not cite mocked `ctx.ui.custom()` tests or an isolated tmux capture as visual proof.
