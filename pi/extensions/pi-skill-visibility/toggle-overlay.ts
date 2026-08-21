import type {
	ExtensionCommandContext,
	Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
	ToggleModel,
	type ToggleDraft,
	type ToggleRow,
} from "./toggle-model.ts";

export interface SkillToggleUiResult {
	action: "apply" | "cancel";
	drafts: ToggleDraft[];
}

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

class SkillToggleOverlay {
	private readonly model: ToggleModel;
	private readonly tui: TUI;
	private readonly theme: Theme;
	private readonly done: (result: SkillToggleUiResult) => void;
	private readonly frame: SkillToggleFrame;

	constructor(
		tui: TUI,
		theme: Theme,
		rows: ToggleRow[],
		done: (result: SkillToggleUiResult) => void,
	) {
		this.tui = tui;
		this.theme = theme;
		this.done = done;
		this.frame = new SkillToggleFrame(theme);
		this.model = new ToggleModel(rows);
	}

	handleInput(data: string): void {
		const effect = this.model.handleInput(data);
		if (effect === "save") {
			this.done({ action: "apply", drafts: this.model.drafts() });
			return;
		}
		if (effect === "cancel") {
			this.done({ action: "cancel", drafts: this.model.drafts() });
			return;
		}
		if (effect === "render") this.tui.requestRender();
	}

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

	invalidate(): void {}

	private degraded(width: number, height: number): string[] {
		const selected = this.model.selectedRow();
		const current = selected ? this.model.modeFor(selected) : undefined;
		const lines = [
			this.theme.fg("accent", this.theme.bold("Skill visibility")),
			selected
				? `${current === "startup" ? "[✓]" : "[ ]"} ${selected.name}`
				: this.theme.fg("dim", "No matching skills"),
			this.model.mode === "search"
				? `Search: ${this.model.query}`
				: `${this.model.changedCount()} changed`,
			this.theme.fg("dim", "space toggle · s save · q quit"),
		];
		return lines.slice(0, height).map((line) => fit(line, width));
	}

	private header(width: number): string {
		const title = this.theme.fg("accent", this.theme.bold("Skill visibility"));
		const summary = this.theme.fg(
			"muted",
			`${this.model.drafts().length} skills · ${this.model.changedCount()} changed`,
		);
		return `${title}${" ".repeat(Math.max(1, width - visibleWidth(title) - visibleWidth(summary)))}${summary}`;
	}

	private rows(width: number, height: number): string[] {
		const visible = this.model.visibleRows();
		const selected = this.model.selectedRow();
		if (visible.length === 0)
			return pad([this.theme.fg("dim", "No matching skills")], height);

		const selectedIndex = selected
			? visible.findIndex((row) => row.id === selected.id)
			: 0;
		const start = Math.max(
			0,
			Math.min(
				selectedIndex - Math.floor(height / 2),
				Math.max(0, visible.length - height),
			),
		);
		const slice = visible.slice(start, start + height);
		const lines = slice.map((row) => {
			const current = this.model.modeFor(row);
			const checkbox = current === "startup" ? "[✓]" : "[ ]";
			const changed =
				current !== row.savedMode ? this.theme.fg("accent", " *") : "";
			const line = `${checkbox} ${row.name}${changed} — ${row.description}`;
			return row.id === selected?.id
				? this.theme.fg("accent", this.theme.bold(fit(line, width)))
				: fit(line, width);
		});
		return pad(lines, height);
	}
}

function fit(text: string, width: number): string {
	const truncated = truncateToWidth(text, Math.max(0, width));
	return `${truncated}${" ".repeat(Math.max(0, width - visibleWidth(truncated)))}`;
}

function pad(lines: string[], height: number): string[] {
	const result = [...lines];
	while (result.length < height) result.push("");
	return result.slice(0, height);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
