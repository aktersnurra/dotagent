import { test } from "node:test"
import assert from "node:assert/strict"
import { route } from "../src/route.ts"

const parse = (d) => d.match(/[MHV][-\d.]+(?: [-\d.]+)?/g)
const line = (x1, y1, x2, y2) => ({ from: "a", to: "b", x1, y1, x2, y2 })

test("a sideways arrow bends at right angles and ends where it should", () => {
  const { d } = route(line(0, 10, 100, 50))
  const cmds = parse(d)
  assert.equal(cmds[0], "M0 10")
  assert.deepEqual(cmds.slice(1).map((c) => c[0]), ["H", "V", "H"])
  assert.equal(cmds.at(-1), "H100")
  assert.match(d, /V50/)
})

test("a downward arrow leaves vertically", () => {
  const { d } = route(line(10, 0, 50, 100))
  assert.deepEqual(parse(d).slice(1).map((c) => c[0]), ["V", "H", "V"])
  assert.equal(parse(d).at(-1), "V100")
})

test("a straight arrow is a single segment", () => {
  assert.deepEqual(parse(route(line(0, 20, 80, 20)).d), ["M0 20", "H80"])
  assert.deepEqual(parse(route(line(20, 0, 20, 80)).d), ["M20 0", "V80"])
})

test("the label point lies on the path's middle segment", () => {
  const { mid } = route(line(0, 10, 100, 50))
  assert.equal(mid.x, 50)
  assert.equal(mid.y, 30)
})
