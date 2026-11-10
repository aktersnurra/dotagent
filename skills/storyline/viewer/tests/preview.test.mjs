import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Effect } from "effect"
import { loadStory } from "../src/story.ts"
import { previewOf } from "../src/preview.ts"

const load = (name) =>
  Effect.runPromise(loadStory(JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"))))
const byId = (story, id) => story.blocks.find((b) => b.id === id)

test("a flow previews its first steps and says how many are left", async () => {
  const story = await load("dotagent-install.story.json")
  const flow = story.blocks.find((b) => b._tag === "Flow")
  const p = previewOf(flow)
  assert.equal(p._tag, "Steps")
  assert.deepEqual(p.items, flow.steps.slice(0, 3))
  assert.equal(p.more, Math.max(0, flow.steps.length - 3))
})

test("a code block previews its first non-empty lines", async () => {
  const story = await load("dotagent-install.story.json")
  const code = story.blocks.find((b) => b._tag === "CodeRef")
  const p = previewOf(code)
  assert.equal(p._tag, "Code")
  assert.ok(p.lines.length > 0 && p.lines.length <= 4)
  assert.ok(p.lines.every((l) => l.trim() !== ""))
  assert.ok(code.code.includes(p.lines[0]))
})

test("a diff previews only changed lines, with their sign", async () => {
  const story = await load("pr-a1b35ba.story.json")
  const diff = story.blocks.find((b) => b._tag === "Diff")
  const p = previewOf(diff)
  assert.equal(p._tag, "Changes")
  assert.ok(p.lines.length > 0 && p.lines.length <= 4)
  assert.ok(p.lines.every((l) => (l.sign === "+" || l.sign === "-") && !l.text.startsWith(l.sign)))
})

test("blocks with nothing visual to show have no preview", async () => {
  const story = await load("pr-a1b35ba.story.json")
  assert.equal(previewOf(story.blocks.find((b) => b._tag === "Risk"))._tag, "None")
  assert.equal(previewOf(story.blocks.find((b) => b._tag === "Summary" || b._tag === "Concept"))._tag, "None")
})

import { kindName } from "../src/preview.ts"
test("each block kind has a plain name for its node header", async () => {
  const story = await load("pr-a1b35ba.story.json")
  const names = new Set(story.blocks.map(kindName))
  assert.ok(names.has("Diff") && names.has("Risk"))
  assert.ok([...names].every((n) => /^[A-Z][a-z]+$/.test(n)))
})
