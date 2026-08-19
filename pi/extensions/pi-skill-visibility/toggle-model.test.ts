import assert from "node:assert/strict";
import test from "node:test";
import { Key } from "@earendil-works/pi-tui";
import { ToggleModel, type ToggleRow } from "./toggle-model.ts";

const rows: ToggleRow[] = [
  { id: "/a/SKILL.md", name: "alpha", description: "First", sourceLabel: "Local", savedMode: "startup" },
  { id: "/b/SKILL.md", name: "beta", description: "Second", sourceLabel: "npm:beta", savedMode: "manual" },
  { id: "/c/SKILL.md", name: "charlie", description: "Third", sourceLabel: "Project", savedMode: "manual" },
];

test("Vim and Colemak-DH keys navigate only in Normal mode", () => {
  const model = new ToggleModel(rows);
  assert.equal(model.selectedRow()?.name, "alpha");
  model.handleInput("j");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("n");
  assert.equal(model.selectedRow()?.name, "charlie");
  model.handleInput("e");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("k");
  assert.equal(model.selectedRow()?.name, "alpha");
});

test("gg and G jump to list bounds", () => {
  const model = new ToggleModel(rows);
  model.handleInput("G");
  assert.equal(model.selectedRow()?.name, "charlie");
  model.handleInput("g");
  model.handleInput("g");
  assert.equal(model.selectedRow()?.name, "alpha");
});

test("Search mode accepts navigation letters as text", () => {
  const model = new ToggleModel(rows);
  model.handleInput("/");
  model.handleInput("b");
  model.handleInput("e");
  assert.equal(model.mode, "search");
  assert.equal(model.query, "be");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("\r");
  assert.equal(model.mode, "normal");
});

test("Space toggles and save/cancel return effects", () => {
  const model = new ToggleModel(rows);
  assert.equal(model.handleInput(" "), "render");
  assert.deepEqual(model.drafts().find((draft) => draft.id === "/a/SKILL.md"), {
    id: "/a/SKILL.md",
    desiredMode: "manual",
  });
  assert.equal(model.changedCount(), 1);
  assert.equal(model.handleInput("s"), "save");
  assert.equal(new ToggleModel(rows).handleInput("q"), "cancel");
});

test("arrow keys and Ctrl+S remain compatibility shortcuts", () => {
  const model = new ToggleModel(rows);
  model.handleInput(Key.down);
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput(Key.up);
  assert.equal(model.selectedRow()?.name, "alpha");
  assert.equal(model.handleInput(Key.ctrl("s")), "save");
});

test("Esc exits Search mode before it cancels Normal mode", () => {
  const model = new ToggleModel(rows);
  model.handleInput("/");
  model.handleInput("b");
  assert.equal(model.handleInput(Key.escape), "render");
  assert.equal(model.mode, "normal");
  assert.equal(model.handleInput(Key.escape), "cancel");
});

test("Backspace updates search, empty matches are safe, and selection clamps", () => {
  const model = new ToggleModel(rows);
  model.handleInput("G");
  model.handleInput("/");
  for (const character of "alpha") model.handleInput(character);
  assert.equal(model.selectedRow()?.name, "alpha");
  for (let index = 0; index < 5; index += 1) model.handleInput(Key.backspace);
  for (const character of "missing") model.handleInput(character);
  assert.equal(model.visibleRows().length, 0);
  assert.equal(model.selectedRow(), undefined);
});
