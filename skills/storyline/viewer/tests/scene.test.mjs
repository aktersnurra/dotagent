import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Effect } from "effect"
import { loadStory } from "../src/story.ts"
import { NODE_H, NODE_W, sceneFor } from "../src/scene.ts"

const load = (name) =>
  Effect.runPromise(loadStory(JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"))))
const at = (scene, id) => scene.nodes.find((n) => n.block.id === id)
const disjoint = (a, b) => a.x + NODE_W <= b.x || b.x + NODE_W <= a.x || a.y + NODE_H <= b.y || b.y + NODE_H <= a.y

const noOverlapAndInside = (scene) => {
  for (const n of scene.nodes) {
    assert.ok(n.x >= 0 && n.y >= 0 && n.x + NODE_W <= scene.width && n.y + NODE_H <= scene.height, `${n.block.id} inside`)
  }
  for (const a of scene.nodes) for (const b of scene.nodes) if (a.block.id < b.block.id) assert.ok(disjoint(a, b), `${a.block.id}/${b.block.id}`)
}

test("a codebase scope with edges flows left to right", async () => {
  const s = sceneFor(await load("dotagent-install.story.json"), undefined)
  assert.equal(s.nodes.length, 5)
  assert.equal(s.lines.length, 3)
  assert.ok(at(s, "entry").x < at(s, "claude").x && at(s, "claude").x < at(s, "skills").x)
  noOverlapAndInside(s)
})

test("a scope without edges is laid out as a grid", async () => {
  const story = await load("dotagent-install.story.json")
  const s = sceneFor(story, "claude")
  assert.equal(s.nodes.length, 3)
  assert.equal(s.lines.length, 0)
  noOverlapAndInside(s)
})

test("a PR story puts background above the walkthrough", async () => {
  const s = sceneFor(await load("pr-a1b35ba.story.json"), undefined)
  assert.equal(s.nodes.length, 7)
  const bg = s.nodes.filter((n) => n.block.section === "background")
  const review = s.nodes.filter((n) => n.block.section === "review")
  assert.ok(Math.max(...bg.map((n) => n.y)) < Math.min(...review.map((n) => n.y)))
  assert.equal(s.labels.length, 2)
  noOverlapAndInside(s)
})

test("PR walkthrough steps are numbered in block order and connected in a chain", async () => {
  const story = await load("pr-a1b35ba.story.json")
  const s = sceneFor(story, undefined)
  const review = s.nodes.filter((n) => n.block.section === "review")
  assert.deepEqual(review.map((n) => n.step), [1, 2, 3, 4])
  assert.deepEqual(review.map((n) => n.block.id), story.blocks.filter((b) => b.section === "review").map((b) => b.id))
  assert.equal(s.lines.length, review.length - 1)
  assert.ok(s.nodes.filter((n) => n.block.section === "background").every((n) => n.step === undefined))
})

test("arrows between codebase blocks say what the relationship is", async () => {
  const s = sceneFor(await load("dotagent-install.story.json"), undefined)
  assert.ok(s.lines.length > 0)
  assert.ok(s.lines.every((l) => typeof l.label === "string" && l.label !== ""))
})

test("the PR walkthrough chain carries no labels", async () => {
  const s = sceneFor(await load("pr-a1b35ba.story.json"), undefined)
  assert.ok(s.lines.every((l) => l.label === undefined))
})
