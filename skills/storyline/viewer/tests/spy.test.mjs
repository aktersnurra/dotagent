import { test } from "node:test"
import assert from "node:assert/strict"
import { sectionAt } from "../src/spy.ts"

const tops = [{ id: "a", top: 100 }, { id: "b", top: 400 }, { id: "c", top: 900 }]

test("above the first section nothing is current: the reader is at the title", () => {
  assert.equal(sectionAt(tops, 50), undefined)
})

test("the current section is the last one whose top has passed the reading line", () => {
  assert.equal(sectionAt(tops, 100), "a")
  assert.equal(sectionAt(tops, 399), "a")
  assert.equal(sectionAt(tops, 400), "b")
  assert.equal(sectionAt(tops, 5000), "c")
})
