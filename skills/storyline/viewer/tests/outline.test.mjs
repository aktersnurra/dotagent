import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Effect } from "effect"
import { loadStory } from "../src/story.ts"
import { outlineRows, readingOrder } from "../src/outline.ts"

const load = (name) =>
  Effect.runPromise(loadStory(JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"))))
const items = (rows) => rows.filter((r) => r._tag === "Item")

test("a PR outline is: overview, background, then the numbered walkthrough", async () => {
  const story = await load("pr-a1b35ba.story.json")
  const rows = outlineRows(story, [])
  assert.equal(rows[0]._tag, "Overview")
  assert.deepEqual(rows.filter((r) => r._tag === "Heading").map((r) => r.text), ["Background", "Walkthrough"])
  const order = rows.map((r) => (r._tag === "Heading" ? r.text : r._tag))
  assert.deepEqual(order, ["Overview", "Background", "Item", "Item", "Item", "Walkthrough", "Item", "Item", "Item", "Item"])
  assert.deepEqual(items(rows).map((r) => r.step), [undefined, undefined, undefined, 1, 2, 3, 4])
})

test("a codebase outline nests parts under the block they belong to", async () => {
  const story = await load("dotagent-install.story.json")
  const rows = items(outlineRows(story, []))
  const ids = rows.map((r) => r.block.id)
  const claude = rows.find((r) => r.block.id === "claude")
  assert.equal(claude.depth, 0)
  assert.equal(claude.hasParts, true)
  const settings = rows.find((r) => r.block.id === "settings")
  assert.equal(settings.depth, 1)
  assert.equal(ids.indexOf("settings"), ids.indexOf("claude") + 1)
  assert.equal(rows.find((r) => r.block.id === "pi").hasParts, false)
})

test("collapsing a block hides its parts from the outline but not from reading order", async () => {
  const story = await load("dotagent-install.story.json")
  const ids = (collapsed) => items(outlineRows(story, collapsed)).map((r) => r.block.id)
  assert.ok(ids([]).includes("settings"))
  assert.ok(!ids(["claude"]).includes("settings"))
  assert.ok(ids(["claude"]).includes("claude"))
  assert.deepEqual(readingOrder(story), ids([]))
})

test("reading order is every block exactly once, parts straight after their parent", async () => {
  for (const name of ["dotagent-install.story.json", "pr-a1b35ba.story.json"]) {
    const story = await load(name)
    const order = readingOrder(story)
    assert.equal(order.length, story.blocks.length)
    assert.equal(new Set(order).size, order.length)
    for (const b of story.blocks) if (b.parent !== undefined) assert.ok(order.indexOf(b.parent) < order.indexOf(b.id))
  }
})
