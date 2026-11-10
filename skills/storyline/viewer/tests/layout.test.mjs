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

const points = (l) => [{ x: l.x1, y: l.y1 }, ...(l.via ?? []), { x: l.x2, y: l.y2 }]

/** True when the straight run from p to q passes through the inside of the box at n. */
const crosses = (p, q, n, w, h) => {
  const inset = 1
  const left = n.x + inset, right = n.x + w - inset, top = n.y + inset, bottom = n.y + h - inset
  if (p.x === q.x) return p.x > left && p.x < right && Math.max(p.y, q.y) > top && Math.min(p.y, q.y) < bottom
  if (p.y === q.y) return p.y > top && p.y < bottom && Math.max(p.x, q.x) > left && Math.min(p.x, q.x) < right
  throw new Error("arrows are drawn with straight runs and right angles only")
}

const assertArrowsClear = (l, w = NODE_W, h = NODE_H) => {
  for (const line of l.lines) {
    const pts = points(line)
    for (let i = 0; i + 1 < pts.length; i++) {
      for (const n of l.nodes) assert.ok(!crosses(pts[i], pts[i + 1], n, w, h), `${line.from}->${line.to} runs behind ${n.id}`)
    }
    for (const p of pts) assert.ok(p.x >= 0 && p.x <= l.width && p.y >= 0 && p.y <= l.height, `${line.from}->${line.to} leaves the drawing`)
  }
}

const graphs = {
  "a chain with a shortcut past the middle": [["a", "b", "c"], [["a", "b"], ["b", "c"], ["a", "c"]]],
  "a fan out and back in": [["a", "b", "c", "d", "e"], [["a", "b"], ["a", "c"], ["a", "d"], ["b", "e"], ["c", "e"], ["d", "e"]]],
  "columns of different heights": [["a", "b", "c", "d", "e", "f"], [["a", "d"], ["b", "d"], ["c", "d"], ["d", "e"], ["a", "f"], ["e", "f"]]],
  "a long shortcut over three layers": [["a", "b", "c", "d"], [["a", "b"], ["b", "c"], ["c", "d"], ["a", "d"], ["b", "d"]]],
  "a cycle": [["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"]]],
}

for (const [name, [ids, pairs]] of Object.entries(graphs)) {
  for (const direction of ["right", "down"]) {
    test(`no arrow runs behind a node: ${name}, drawn ${direction}`, () => {
      const l = layout(ids, pairs.map(([from, to]) => ({ from, to })), { direction })
      assert.equal(l.lines.length, pairs.length)
      assertArrowsClear(l)
    })
  }
}

test("an arrow leaves the side of its block that faces the next layer and enters the facing side", () => {
  const l = layout(["a", "b"], [{ from: "a", to: "b" }], { direction: "right" })
  const [line] = l.lines
  assert.equal(line.x1, pos(l, "a").x + NODE_W)
  assert.equal(line.x2, pos(l, "b").x)
})
