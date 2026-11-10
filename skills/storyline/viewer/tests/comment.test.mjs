import { test } from "node:test"
import assert from "node:assert/strict"
import { cleanQuote, Comment } from "../src/comment.ts"

test("a quote is whitespace-collapsed and trimmed", () => {
  assert.equal(cleanQuote("  one\n\n   two\tthree  "), "one two three")
})

test("an empty or blank selection is no quote", () => {
  assert.equal(cleanQuote(""), undefined)
  assert.equal(cleanQuote(" \n\t "), undefined)
})

test("a long quote is cut with an ellipsis, at the limit", () => {
  const q = cleanQuote("word ".repeat(200))
  assert.ok(q.length <= 280)
  assert.ok(q.endsWith("…"))
})

test("a draft comment carries its block and the quoted text", () => {
  const c = Comment.Draft({ id: "c1", blockId: "b", quote: "x", text: "" })
  assert.equal(c._tag, "Draft")
  assert.equal(c.quote, "x")
})
