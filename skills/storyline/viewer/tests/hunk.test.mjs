import { test } from "node:test"
import assert from "node:assert/strict"
import { hunkLines } from "../src/hunk.ts"

const patch = "@@ -10,4 +10,5 @@ install() {\n keep\n-old one\n+new one\n+new two\n keep too\n"

test("lines carry their numbers on each side of the change", () => {
  assert.deepEqual(hunkLines(patch), [
    { kind: "hdr", text: "@@ -10,4 +10,5 @@ install() {" },
    { kind: "ctx", text: "keep", old: 10, new: 10 },
    { kind: "del", text: "old one", old: 11 },
    { kind: "add", text: "new one", new: 11 },
    { kind: "add", text: "new two", new: 12 },
    { kind: "ctx", text: "keep too", old: 12, new: 13 },
  ])
})

test("the newline that ends a patch is not a line of code", () => {
  assert.equal(hunkLines("@@ -1 +1 @@\n-a\n+b\n").length, 3)
  assert.equal(hunkLines("@@ -1 +1 @@\n-a\n+b").length, 3)
})

test("a header without counts starts at the given line", () => {
  assert.deepEqual(hunkLines("@@ -7 +9 @@\n-a\n+b").slice(1), [
    { kind: "del", text: "a", old: 7 },
    { kind: "add", text: "b", new: 9 },
  ])
})

test("an empty context line inside a patch is kept and numbered", () => {
  assert.deepEqual(hunkLines("@@ -1,3 +1,3 @@\n a\n\n b")[2], { kind: "ctx", text: "", old: 2, new: 2 })
})

test("the no-newline marker is a note, not a numbered line", () => {
  assert.deepEqual(hunkLines("@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+b")[2], { kind: "note", text: "No newline at end of file" })
})
