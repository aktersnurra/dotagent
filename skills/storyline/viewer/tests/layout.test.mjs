import { test } from "node:test"
import assert from "node:assert/strict"
import { layout, NODE_H, NODE_W } from "../src/layout.ts"

const pos = (l, id) => l.nodes.find((n) => n.id === id)

test("a chain is placed one row per step, top to bottom", () => {
  const l = layout(["a", "b", "c"], [{ from: "a", to: "b" }, { from: "b", to: "c" }])
  assert.ok(pos(l, "a").y < pos(l, "b").y && pos(l, "b").y < pos(l, "c").y)
})

test("a node sits below the deepest node that points at it", () => {
  const l = layout(["a", "b", "c"], [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "a", to: "c" }])
  assert.ok(pos(l, "c").y > pos(l, "b").y)
})

test("a cycle terminates and places every node", () => {
  const l = layout(["a", "b"], [{ from: "a", to: "b" }, { from: "b", to: "a" }])
  assert.equal(l.nodes.length, 2)
})

test("nodes never overlap and stay inside the drawing", () => {
  const ids = ["a", "b", "c", "d", "e"]
  const l = layout(ids, [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }, { from: "c", to: "e" }])
  for (const n of l.nodes) {
    assert.ok(n.x >= 0 && n.x + NODE_W <= l.width && n.y >= 0 && n.y + NODE_H <= l.height)
  }
  for (const a of l.nodes) for (const b of l.nodes) {
    if (a.id < b.id) assert.ok(a.x + NODE_W <= b.x || b.x + NODE_W <= a.x || a.y + NODE_H <= b.y || b.y + NODE_H <= a.y)
  }
})

test("edges to unknown ids and self edges are ignored", () => {
  const l = layout(["a"], [{ from: "a", to: "a" }, { from: "a", to: "zzz" }])
  assert.equal(l.lines.length, 0)
})
