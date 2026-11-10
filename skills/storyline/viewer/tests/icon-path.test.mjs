import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { pathOf } from "../src/icon-path.ts"

test("extracts the path data from a Material Symbols svg", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path d="M240-400h480v-60Z"/></svg>'
  assert.equal(pathOf(svg), "M240-400h480v-60Z")
})

test("every icon the viewer uses has exactly one path", () => {
  for (const name of ["comment", "close", "add", "remove", "fit_screen", "chevron_left", "chevron_right"]) {
    const svg = readFileSync(new URL(`../node_modules/@material-symbols/svg-400/outlined/${name}.svg`, import.meta.url), "utf8")
    assert.ok(pathOf(svg).length > 10, name)
    assert.equal((svg.match(/<path/g) ?? []).length, 1, name)
  }
})

test("a file without a path is rejected, not drawn blank", () => {
  assert.throws(() => pathOf("<svg></svg>"), /no path/i)
})
