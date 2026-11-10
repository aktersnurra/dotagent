import { test } from "node:test"
import assert from "node:assert/strict"
import { clampK, fitTo, MAX_FIT, MAX_K, MIN_K, panBy, toWorld, zoomAt } from "../src/canvas-math.ts"

const vp = { x: 40, y: -20, k: 1 }
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)

test("zooming keeps the point under the cursor fixed", () => {
  const cursor = { x: 300, y: 200 }
  const before = toWorld(vp, cursor)
  const after = toWorld(zoomAt(vp, cursor, 1.5), cursor)
  near(after.x, before.x)
  near(after.y, before.y)
})

test("zoom is clamped to its limits", () => {
  assert.equal(zoomAt(vp, { x: 0, y: 0 }, 1000).k, MAX_K)
  assert.equal(zoomAt(vp, { x: 0, y: 0 }, 0.0001).k, MIN_K)
  assert.equal(clampK(1), 1)
})

test("panning moves the viewport by the drag distance", () => {
  assert.deepEqual(panBy(vp, 10, -5), { x: 50, y: -25, k: 1 })
})

test("fit centres the content and keeps it inside the view", () => {
  const f = fitTo({ width: 1000, height: 400 }, { width: 800, height: 600 }, 40)
  assert.ok(f.k <= 1)
  const w = 1000 * f.k, h = 400 * f.k
  assert.ok(f.x >= 40 - 1e-9 && f.x + w <= 800 - 40 + 1e-9)
  near(f.x + w / 2, 400)
  near(f.y + h / 2, 300)
})

test("fit enlarges small content to fill a large view, but not past the cap", () => {
  const big = fitTo({ width: 800, height: 300 }, { width: 3800, height: 2000 }, 64)
  assert.equal(big.k, MAX_FIT)
  const tiny = fitTo({ width: 100, height: 100 }, { width: 800, height: 600 }, 40)
  assert.equal(tiny.k, MAX_FIT)
  const exact = fitTo({ width: 1000, height: 400 }, { width: 1128, height: 528 }, 64)
  assert.ok(Math.abs(exact.k - 1) < 1e-9)
})
