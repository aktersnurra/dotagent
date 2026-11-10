import { test } from "node:test"
import assert from "node:assert/strict"
import { Action, initialState, reduce } from "../src/state.ts"
import { Comment } from "../src/comment.ts"


test("the viewer starts on the overview with nothing read", () => {
  assert.equal(initialState.current, undefined)
  assert.deepEqual(initialState.visited, [])
  assert.equal(initialState.view, "read")
})

test("going to a block makes it current and marks it read once", () => {
  let s = reduce(initialState, Action.Go({ id: "a" }))
  s = reduce(s, Action.Go({ id: "b" }))
  s = reduce(s, Action.Go({ id: "a" }))
  assert.equal(s.current, "a")
  assert.deepEqual(s.visited, ["a", "b"])
})

test("going to the overview marks nothing read", () => {
  const s = reduce(reduce(initialState, Action.Go({ id: "a" })), Action.Go({ id: undefined }))
  assert.equal(s.current, undefined)
  assert.deepEqual(s.visited, ["a"])
})

test("going to a block from the map returns to reading", () => {
  const s = reduce(reduce(initialState, Action.SetView({ view: "map" })), Action.Go({ id: "a" }))
  assert.equal(s.view, "read")
})

test("blocks with parts can be collapsed and expanded in the outline", () => {
  const s = reduce(initialState, Action.ToggleCollapsed({ id: "a" }))
  assert.deepEqual(s.collapsed, ["a"])
  assert.deepEqual(reduce(s, Action.ToggleCollapsed({ id: "a" })).collapsed, [])
})

const open = (s, id, blockId = "b", quote = "") => reduce(s, Action.OpenDraft({ id, blockId, quote }))
const typed = (s, id, text, blockId = "b", quote = "") => reduce(s, Action.UpdateComment({ comment: Comment.Draft({ id, blockId, quote, text }) }))
const answered = (s, id, blockId = "b", quote = "") => reduce(s, Action.UpdateComment({ comment: Comment.Answered({ id, blockId, quote, text: "q", answer: "a" }) }))

test("pointing at something opens one draft about it", () => {
  const s = open(initialState, "c1", "b", "a passage")
  assert.deepEqual(s.comments, [Comment.Draft({ id: "c1", blockId: "b", quote: "a passage", text: "" })])
})

test("pointing at the same thing again does not open a second draft", () => {
  assert.equal(open(open(initialState, "c1"), "c2").comments.length, 1)
  const withText = typed(open(initialState, "c1"), "c1", "why?")
  assert.deepEqual(open(withText, "c2").comments.map((c) => c.id), ["c1"])
})

test("pointing somewhere else drops a draft that was left empty, and keeps one with a question in it", () => {
  assert.deepEqual(open(open(initialState, "c1", "b", "one"), "c2", "b", "two").comments.map((c) => c.id), ["c2"])
  const kept = typed(open(initialState, "c1", "b", "one"), "c1", "why?", "b", "one")
  assert.deepEqual(open(kept, "c2", "b", "two").comments.map((c) => c.id), ["c1", "c2"])
})

test("a new question about something already answered joins its thread, not the end", () => {
  let s = answered(open(initialState, "c1", "b", "one"), "c1", "b", "one")
  s = answered(open(s, "c2", "b", "two"), "c2", "b", "two")
  s = open(s, "c3", "b", "one")
  assert.deepEqual(s.comments.map((c) => c.id), ["c1", "c3", "c2"])
})

test("a comment can be updated by id and removed by id", () => {
  let s = typed(open(initialState, "c1"), "c1", "why?")
  assert.equal(s.comments[0].text, "why?")
  s = reduce(s, Action.RemoveComment({ id: "c1" }))
  assert.deepEqual(s.comments, [])
})

test("a thread is removed whole, and other threads stay", () => {
  let s = answered(open(initialState, "c1", "b", "one"), "c1", "b", "one")
  s = typed(open(s, "c2", "b", "one"), "c2", "more?", "b", "one")
  s = answered(open(s, "c3", "b", "two"), "c3", "b", "two")
  s = reduce(s, Action.RemoveThread({ blockId: "b", quote: "one" }))
  assert.deepEqual(s.comments.map((c) => c.id), ["c3"])
})
