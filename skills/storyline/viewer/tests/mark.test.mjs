import { test } from "node:test"
import assert from "node:assert/strict"
import { findQuote } from "../src/mark.ts"

test("a quote inside one piece of text is found at its offsets", () => {
  assert.deepEqual(findQuote(["The copy replaced only lsp.json."], "replaced only"), { start: { node: 0, offset: 9 }, end: { node: 0, offset: 22 } })
})

test("a quote may run across pieces and differ in whitespace", () => {
  const texts = ["first paragraph.", "second  one\n here"]
  assert.deepEqual(findQuote(texts, "paragraph. second one here"), { start: { node: 0, offset: 6 }, end: { node: 1, offset: 17 } })
})

test("a quote cut with an ellipsis is found by what is left of it", () => {
  assert.deepEqual(findQuote(["a long passage of text"], "long pass…"), { start: { node: 0, offset: 2 }, end: { node: 0, offset: 11 } })
})

test("a quote that is not there, or is empty, is not found", () => {
  assert.equal(findQuote(["some text"], "other words"), undefined)
  assert.equal(findQuote(["some text"], ""), undefined)
})
