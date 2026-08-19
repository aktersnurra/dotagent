import type { ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { ToggleModel, type ToggleDraft, type ToggleRow } from "./toggle-model.ts";

export interface SkillToggleUiResult {
  action: "apply" | "cancel";
  drafts: ToggleDraft[];
}

export function showSkillToggleUi(
  ctx: ExtensionCommandContext,
  rows: ToggleRow[],
): Promise<SkillToggleUiResult> {
  return ctx.ui.custom<SkillToggleUiResult>(
    (tui, theme, _keybindings, done) => new SkillToggleOverlay(tui, theme, rows, done),
    {
      overlay: true,
      overlayOptions: { anchor: "center", width: "82%", maxHeight: "86%", minWidth: 72 },
    },
  );
}

class SkillToggleOverlay {
  private readonly model: ToggleModel;
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
    const innerWidth = Math.max(32, width - 2);
    const height = clamp(Math.floor((this.tui.terminal.rows ?? 30) * 0.78), 14, 42);
    const bodyHeight = Math.max(6, height - 7);
    const header = this.header(innerWidth);
    const search = this.model.mode === "search"
      ? this.theme.fg("accent", `Search: ${this.model.query}▏`)
      : this.theme.fg("muted", `Search: ${this.model.query || "press /"}`);
    const body = this.rows(innerWidth, bodyHeight);
    const footer = this.theme.fg("dim", "j/n down · k/e up · gg/G jump · / search · space toggle · s save · q quit");

    return [
      this.theme.fg("borderAccent", `┌${"─".repeat(innerWidth)}┐`),
      frame(this.theme, header, innerWidth),
      frame(this.theme, search, innerWidth),
      this.theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`),
      ...body.map((line) => frame(this.theme, line, innerWidth)),
      this.theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`),
      frame(this.theme, footer, innerWidth),
      this.theme.fg("borderAccent", `└${"─".repeat(innerWidth)}┘`),
    ];
  }

  invalidate(): void {}

  private header(width: number): string {
    const title = this.theme.fg("accent", this.theme.bold("Skill visibility"));
    const summary = this.theme.fg("muted", `${this.model.drafts().length} skills · ${this.model.changedCount()} changed`);
    return `${title}${" ".repeat(Math.max(1, width - visibleWidth(title) - visibleWidth(summary)))}${summary}`;
  }

  private rows(width: number, height: number): string[] {
    const visible = this.model.visibleRows();
    const selected = this.model.selectedRow();
    if (visible.length === 0) return pad([this.theme.fg("dim", "No matching skills")], height);

    const selectedIndex = selected ? visible.findIndex((row) => row.id === selected.id) : 0;
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(height / 2), Math.max(0, visible.length - height)));
    const slice = visible.slice(start, start + height);
    const lines = slice.map((row) => {
      const current = this.model.modeFor(row);
      const changed = current !== row.savedMode ? this.theme.fg("accent", " *") : "";
      const marker = row.id === selected?.id ? "›" : " ";
      const label = `${marker} ${row.name}${changed}`;
      const source = this.theme.fg("dim", ` — ${row.sourceLabel}`);
      const status = current === "startup"
        ? this.theme.fg("accent", "STARTUP")
        : this.theme.fg("muted", "MANUAL");
      const left = `${label}${source}`;
      const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(status));
      const line = `${left}${" ".repeat(gap)}${status}`;
      return row.id === selected?.id
        ? this.theme.fg("accent", this.theme.bold(fit(line, width)))
        : fit(line, width);
    });
    return pad(lines, height);
  }
}

function frame(theme: Theme, content: string, width: number): string {
  return `${theme.fg("borderAccent", "│")}${fit(content, width)}${theme.fg("borderAccent", "│")}`;
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
