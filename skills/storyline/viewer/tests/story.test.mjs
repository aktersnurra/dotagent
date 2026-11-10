import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Effect, Exit } from "effect"
import { loadStory } from "../src/story.ts"

const fixture = () => JSON.parse(readFileSync(new URL("../fixtures/dotagent-install.story.json", import.meta.url), "utf8"))
const run = (input) => Effect.runPromiseExit(loadStory(input))
const problems = (exit) => (Exit.isFailure(exit) ? exit.cause.reasons.flatMap((r) => r.error?.problems ?? []) : [])

test("the hand-written fixture is a valid story", async () => {
  assert.ok(Exit.isSuccess(await run(fixture())))
})

test("a CodeRef without anchors is rejected", async () => {
  const s = fixture()
  s.blocks.find((b) => b._tag === "CodeRef").anchors = []
  assert.ok(Exit.isFailure(await run(s)))
})

test("a Summary may have no anchors", async () => {
  const s = fixture()
  assert.deepEqual(s.blocks.find((b) => b._tag === "Summary").anchors, [])
  assert.ok(Exit.isSuccess(await run(s)))
})

test("an edge to an unknown block is reported", async () => {
  const s = fixture()
  s.edges.push({ from: "entry", to: "nope", kind: "calls" })
  assert.match(problems(await run(s)).join("\n"), /unknown block "nope"/)
})

test("an anchor at another revision is reported", async () => {
  const s = fixture()
  s.blocks[1].anchors[0].revision = "deadbeef"
  assert.match(problems(await run(s)).join("\n"), /not the story revision/)
})

test("a child must sit one level below its parent", async () => {
  const s = fixture()
  s.blocks.find((b) => b.id === "plugins").level = 2
  assert.match(problems(await run(s)).join("\n"), /one level below/)
})

test("duplicate ids are reported", async () => {
  const s = fixture()
  s.blocks.push({ ...s.blocks[0] })
  assert.match(problems(await run(s)).join("\n"), /duplicate block id/)
})

test("an edge between non-siblings is reported", async () => {
  const s = fixture()
  s.edges.push({ from: "entry", to: "plugins", kind: "calls" })
  assert.match(problems(await run(s)).join("\n"), /not siblings/)
})
