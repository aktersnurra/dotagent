import type {
	ExtensionCommandContext,
	Theme,
} from "@earendil-works/pi-coding-agent";
import {
	Input,
	Key,
	matchesKey,
	truncateToWidth,
	visibleWidth,
	type Focusable,
	type TUI,
} from "@earendil-works/pi-tui";
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
			new SkillToggleSelector(tui, theme, rows, done),
		{
			overlay: true,
			overlayOptions: {
				anchor: "center",
				width: "92%",
				minWidth: 76,
				maxHeight: "88%",
				margin: 1,
			},
		},
	);
}

class SkillToggleSelector implements Focusable {
	private _focused = false;
	private readonly model: ToggleModel;
	private readonly searchInput = new Input();
	private readonly tui: TUI;
	private readonly theme: Theme;
	private readonly done: (result: SkillToggleUiResult) => void;

	constructor(
		tui: TUI,
		theme: Theme,
		rows: ToggleRow[],
		done: (result: SkillToggleUiResult) => void,
	) {
		this.tui = tui;
		this.theme = theme;
		this.done = done;
		this.model = new ToggleModel(rows);
	}

	get focused(): boolean {
		return this._focused;
	}

	set focused(value: boolean) {
		this._focused = value;
		this.syncSearchFocus();
	}

	handleInput(data: string): void {
		if (this.model.mode === "search") {
			this.handleSearchInput(data);
			return;
		}

		const effect = this.model.handleInput(data);
		if (effect === "save") {
			this.done({ action: "apply", drafts: this.model.drafts() });
			return;
		}
		if (effect === "cancel") {
			this.done({ action: "cancel", drafts: this.model.drafts() });
			return;
		}
		this.searchInput.setValue(this.model.query);
		this.syncSearchFocus();
		if (effect === "render") this.tui.requestRender();
	}

	render(width: number): string[] {
		const renderWidth = Math.max(0, Math.floor(width));
		const terminalRows = Math.max(0, Math.floor(this.tui.terminal.rows ?? 30));
		if (renderWidth === 0 || terminalRows === 0) return [];

		const height = Math.min(
			terminalRows,
			clamp(Math.floor(terminalRows * 0.65), 8, 14),
		);
		if (renderWidth < 36 || terminalRows < 8) {
			return this.degraded(renderWidth, height);
		}

		const innerWidth = Math.max(0, renderWidth - 4);
		const bodyHeight = Math.max(0, height - 4);
		const top = this.theme.fg(
			"borderAccent",
			`┌${"─".repeat(Math.max(0, renderWidth - 2))}┐`,
		);
		const bottom = this.theme.fg(
			"borderAccent",
			`└${"─".repeat(Math.max(0, renderWidth - 2))}┘`,
		);
		const lines = [
			top,
			this.renderFramedLine(this.header(innerWidth), renderWidth),
			this.renderFramedLine(this.toolbar(innerWidth), renderWidth),
			...this.rows(innerWidth, bodyHeight).map((line) =>
				this.renderFramedLine(line, renderWidth),
			),
			bottom,
		];
		return lines.slice(0, height).map((line) => fit(line, renderWidth));
	}

	invalidate(): void {
		this.searchInput.invalidate();
	}

	private handleSearchInput(data: string): void {
		if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
			const effect = this.model.handleInput(data);
			this.syncSearchFocus();
			if (effect === "render") this.tui.requestRender();
			return;
		}

		this.searchInput.handleInput(data);
		this.model.setSearchQuery(this.searchInput.getValue());
		this.tui.requestRender();
	}

	private syncSearchFocus(): void {
		this.searchInput.focused = this._focused && this.model.mode === "search";
	}

	private renderFramedLine(content: string, width: number): string {
		const innerWidth = Math.max(0, width - 4);
		const padded = fit(content, innerWidth);
		return `${this.theme.fg("borderAccent", "│")} ${padded} ${this.theme.fg("borderAccent", "│")}`;
	}

	private degraded(width: number, height: number): string[] {
		const selected = this.model.selectedRow();
		let selectedLine = this.theme.fg("dim", "No matching skills");
		if (selected) {
			const checkbox =
				this.model.modeFor(selected) === "startup" ? "[✓]" : "[ ]";
			selectedLine = `${checkbox} ${selected.name}`;
		}
		const lines = [
			this.theme.fg("accent", this.theme.bold("Skill visibility")),
			selectedLine,
			this.model.mode === "search"
				? `Filter: ${this.model.query}`
				: `${this.model.changedCount()} changed`,
			this.theme.fg("dim", "↑↓ move · space toggle · s save · q close"),
		];
		return lines.slice(0, height).map((line) => fit(line, width));
	}

	private toolbar(width: number): string {
		const filter =
			this.model.mode === "search"
				? this.theme.fg("accent", `Filter: ${this.model.query}▏`)
				: this.theme.fg("muted", "Filter: press /");
		const help = this.theme.fg(
			"dim",
			"↑↓ move · space toggle · s save · q close",
		);
		const gap = width - visibleWidth(filter) - visibleWidth(help);
		return gap > 0
			? `${filter}${" ".repeat(gap)}${help}`
			: truncateToWidth(`${filter} · ${help}`, width);
	}

	private header(width: number): string {
		const title = this.theme.fg("accent", this.theme.bold("Skill visibility"));
		const summary = this.theme.fg(
			"muted",
			`${this.model.drafts().length} skills · ${this.model.changedCount()} changed`,
		);
		const gap = width - visibleWidth(title) - visibleWidth(summary);
		return gap > 0
			? `${title}${" ".repeat(gap)}${summary}`
			: truncateToWidth(`${title} · ${summary}`, width);
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
			const line = truncateToWidth(
				`${checkbox} ${singleLine(row.name)}${changed} — ${singleLine(row.description)}`,
				width,
			);
			return row.id === selected?.id
				? this.theme.bg("selectedBg", this.theme.fg("accent", line))
				: line;
		});
		return pad(lines, height);
	}
}

function singleLine(text: string): string {
	return text.replace(/\s+/gu, " ").trim();
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
