import { test } from "node:test"
import assert from "node:assert/strict"
import { Effect, Exit } from "effect"
import { Comment } from "../src/comment.ts"
import { AskFailed } from "../src/asker.ts"
import { fromSaved, toSaved } from "../src/saved.ts"

const base = { id: "c1", blockId: "b", quote: "a passage", text: "why?" }
const roundTrip = (comments) => Effect.runSync(fromSaved(JSON.parse(JSON.stringify(toSaved(comments)))))

test("an answered comment comes back answered", () => {
  assert.deepEqual(roundTrip([Comment.Answered({ ...base, answer: "because" })]), [Comment.Answered({ ...base, answer: "because" })])
})

test("a question without an answer comes back as a draft, whatever state it was in", () => {
  const draft = Comment.Draft(base)
  assert.deepEqual(roundTrip([draft]), [draft])
  assert.deepEqual(roundTrip([Comment.Pending({ ...base, partial: "be" })]), [draft])
  assert.deepEqual(roundTrip([Comment.Failed({ ...base, error: new AskFailed({ code: "x", message: "m", partial: undefined }) })]), [draft])
})

test("a draft with no question yet is not saved", () => {
  assert.deepEqual(toSaved([Comment.Draft({ ...base, text: "  " })]), [])
})

test("the order of comments is kept", () => {
  const a = Comment.Answered({ ...base, id: "a", answer: "1" })
  const b = Comment.Draft({ ...base, id: "b" })
  assert.deepEqual(roundTrip([a, b]).map((c) => c.id), ["a", "b"])
})

test("a saved file of the wrong shape is rejected", () => {
  assert.ok(Exit.isFailure(Effect.runSyncExit(fromSaved({ not: "a list" }))))
  assert.ok(Exit.isFailure(Effect.runSyncExit(fromSaved([{ id: "c1" }]))))
})
