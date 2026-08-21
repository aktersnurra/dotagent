import { Key, matchesKey, type KeyId } from "@earendil-works/pi-tui";
import type { SkillVisibilityMode } from "./policy.ts";

export interface ToggleRow {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  savedMode: SkillVisibilityMode;
}

export interface ToggleDraft {
  id: string;
  desiredMode: SkillVisibilityMode;
}

export type ToggleEffect = "render" | "save" | "cancel" | undefined;
export type ToggleInputMode = "normal" | "search";

export class ToggleModel {
  public mode: ToggleInputMode = "normal";
  public query = "";
  private selectedIndex = 0;
  private pendingG = false;
  private readonly desired = new Map<string, SkillVisibilityMode>();
  private readonly rows: ToggleRow[];

  constructor(rows: ToggleRow[]) {
    this.rows = rows;
    for (const row of rows) this.desired.set(row.id, row.savedMode);
  }

  handleInput(data: string): ToggleEffect {
    if (this.mode === "search") return this.handleSearchInput(data);

    if (matchesInput(data, Key.escape) || data === "q") return "cancel";
    if (matchesInput(data, Key.ctrl("s")) || data === "s") return "save";
    if (data === "/") {
      this.mode = "search";
      this.pendingG = false;
      return "render";
    }
    if (data === "G") {
      this.selectedIndex = Math.max(0, this.visibleRows().length - 1);
      this.pendingG = false;
      return "render";
    }
    if (data === "g") {
      if (this.pendingG) {
        this.selectedIndex = 0;
        this.pendingG = false;
        return "render";
      }
      this.pendingG = true;
      return undefined;
    }
    this.pendingG = false;

    if (matchesInput(data, Key.down) || data === "j" || data === "n") {
      this.move(1);
      return "render";
    }
    if (matchesInput(data, Key.up) || data === "k" || data === "e") {
      this.move(-1);
      return "render";
    }
    if (matchesInput(data, Key.space)) {
      const row = this.selectedRow();
      if (!row) return undefined;
      this.desired.set(row.id, this.modeFor(row) === "startup" ? "manual" : "startup");
      return "render";
    }
    return undefined;
  }

  visibleRows(): ToggleRow[] {
    const tokens = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const visible = tokens.length === 0 ? this.rows : this.rows.filter((row) => {
      const text = [row.name, row.description, row.sourceLabel, row.id, this.modeFor(row)].join(" ").toLowerCase();
      return tokens.every((token) => text.includes(token));
    });
    this.selectedIndex = clamp(this.selectedIndex, 0, Math.max(0, visible.length - 1));
    return visible;
  }

  selectedRow(): ToggleRow | undefined {
    return this.visibleRows()[this.selectedIndex];
  }

  modeFor(row: ToggleRow): SkillVisibilityMode {
    return this.desired.get(row.id) ?? row.savedMode;
  }

  drafts(): ToggleDraft[] {
    return this.rows.map((row) => ({ id: row.id, desiredMode: this.modeFor(row) }));
  }

  changedCount(): number {
    return this.rows.filter((row) => this.modeFor(row) !== row.savedMode).length;
  }

  setSearchQuery(query: string): void {
    if (query === this.query) return;
    this.query = query;
    this.selectedIndex = 0;
  }

  private handleSearchInput(data: string): ToggleEffect {
    if (matchesInput(data, Key.enter)) {
      this.mode = "normal";
      return "render";
    }
    if (matchesInput(data, Key.escape)) {
      this.mode = "normal";
      return "render";
    }
    if (matchesInput(data, Key.backspace)) {
      this.setSearchQuery(Array.from(this.query).slice(0, -1).join(""));
      return "render";
    }
    if (isPrintableInput(data)) {
      this.setSearchQuery(this.query + data);
      return "render";
    }
    return undefined;
  }

  private move(delta: number): void {
    const count = this.visibleRows().length;
    if (count === 0) return;
    this.selectedIndex = clamp(this.selectedIndex + delta, 0, count - 1);
  }
}

function matchesInput(data: string, key: KeyId): boolean {
  return data === key || matchesKey(data, key);
}

function isPrintableInput(data: string): boolean {
  return data.length > 0 && !data.includes("\x1b") && !data.includes("\r") && !data.includes("\n") && data >= " ";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
