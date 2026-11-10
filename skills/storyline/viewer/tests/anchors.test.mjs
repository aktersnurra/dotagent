import { test } from "node:test"
import assert from "node:assert/strict"
import { anchorProblems } from "../src/verify.ts"

const rev = "abc1234"
const files = { "a.sh": "one\ntwo\nthree\nfour\n" }
const read = (path) => files[path]
const block = (extra) => ({ id: "b", label: "b", title: "t", summary: "s", level: 0, ...extra })
const story = (b) => ({ kind: "codebase", revision: rev, title: "T", levels: [{ level: 0, name: "L" }], blocks: [block(b)], edges: [] })
const at = (path, startLine, endLine) => ({ path, startLine, endLine, revision: rev })

test("anchors inside real files and code that matches them pass", () => {
  assert.deepEqual(anchorProblems(story({ _tag: "CodeRef", code: "two\nthree", anchors: [at("a.sh", 2, 3)] }), read), [])
  assert.deepEqual(anchorProblems(story({ _tag: "Concept", anchors: [at("a.sh", 1, 4)] }), read), [])
})

test("an anchor to a file that is not there at the revision is a problem", () => {
  assert.deepEqual(anchorProblems(story({ _tag: "Concept", anchors: [at("gone.sh", 1, 1)] }), read),
    [`block "b": gone.sh does not exist at abc1234`])
})

test("an anchor past the end of the file is a problem", () => {
  assert.deepEqual(anchorProblems(story({ _tag: "Concept", anchors: [at("a.sh", 3, 9)] }), read),
    [`block "b": a.sh:3-9 runs past the end of the file (4 lines)`])
})

test("code that differs from the anchored lines is a problem", () => {
  assert.deepEqual(anchorProblems(story({ _tag: "CodeRef", code: "two\nTHREE", anchors: [at("a.sh", 2, 3)] }), read),
    [`block "b": code does not match a.sh:2-3 at abc1234`])
})

test("trailing spaces and a final newline do not count as a difference", () => {
  assert.deepEqual(anchorProblems(story({ _tag: "CodeRef", code: "two  \nthree\n", anchors: [at("a.sh", 2, 3)] }), read), [])
})

test("indentation counts: code must be copied, not reflowed", () => {
  const indented = (path) => (path === "a.sh" ? "if x\n  two\n" : undefined)
  assert.equal(anchorProblems(story({ _tag: "CodeRef", code: "two", anchors: [at("a.sh", 2, 2)] }), indented).length, 1)
})
