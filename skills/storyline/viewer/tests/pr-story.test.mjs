import { test } from "node:test"
import assert from "node:assert/strict"
import { Effect, Exit } from "effect"
import { loadStory } from "../src/story.ts"
import { unverifiedHunks } from "../src/verify.ts"

const rev = "abc1234"
const anchor = (path, s, e) => ({ path, startLine: s, endLine: e, revision: rev })
const common = (id, section) => ({ id, label: id, title: `${id} title`, summary: `${id} summary`, level: 0, section })

const diffText = [
  "diff --git a/f.sh b/f.sh",
  "--- a/f.sh",
  "+++ b/f.sh",
  "@@ -1,3 +1,4 @@",
  " one",
  "-two",
  "+two changed",
  "+three",
  " four",
  "",
].join("\n")

const prStory = () => ({
  kind: "pr",
  revision: rev,
  title: "A change",
  levels: [{ level: 0, name: "PR" }],
  blocks: [
    { _tag: "Concept", ...common("why", "background"), anchors: [] },
    {
      _tag: "Diff", ...common("change", "review"), reason: "Start here: everything else follows from it.",
      hunks: [{ path: "f.sh", patch: "@@ -1,3 +1,4 @@\n one\n-two\n+two changed\n+three\n four" }],
      anchors: [anchor("f.sh", 1, 4)],
    },
    { _tag: "Risk", ...common("risk", "review"), severity: "medium", anchors: [anchor("f.sh", 2, 3)] },
  ],
  edges: [],
})

const run = (s) => Effect.runPromiseExit(loadStory(s))
const problems = (exit) => (Exit.isFailure(exit) ? exit.cause.reasons.flatMap((r) => r.error?.problems ?? []) : [])

test("a PR story with background, a diff and a risk is valid", async () => {
  assert.ok(Exit.isSuccess(await run(prStory())))
})

test("a top-level block of a PR story needs a section", async () => {
  const s = prStory()
  delete s.blocks[0].section
  assert.match(problems(await run(s)).join("\n"), /needs a section/)
})

test("a codebase story must not use sections", async () => {
  const s = prStory()
  s.kind = "codebase"
  assert.match(problems(await run(s)).join("\n"), /only PR stories use sections/)
})

test("a Diff without hunks is rejected", async () => {
  const s = prStory()
  s.blocks[1].hunks = []
  assert.ok(Exit.isFailure(await run(s)))
})

test("a hunk patch must start with a hunk header", async () => {
  const s = prStory()
  s.blocks[1].hunks[0].patch = " one\n-two"
  assert.match(problems(await run(s)).join("\n"), /hunk header/)
})

test("a Risk needs an anchor and a known severity", async () => {
  const noAnchor = prStory()
  noAnchor.blocks[2].anchors = []
  assert.ok(Exit.isFailure(await run(noAnchor)))
  const badSeverity = prStory()
  badSeverity.blocks[2].severity = "scary"
  assert.ok(Exit.isFailure(await run(badSeverity)))
})

test("hunks that appear in the real diff verify", async () => {
  const exit = await run(prStory())
  assert.deepEqual(unverifiedHunks(exit.value, diffText), [])
})

test("trailing whitespace differences do not fail verification", async () => {
  const exit = await run(prStory())
  assert.deepEqual(unverifiedHunks(exit.value, diffText.replaceAll("\n", "  \n")), [])
})

test("a hunk that is not in the real diff is reported", async () => {
  const s = prStory()
  s.blocks[1].hunks[0].patch = "@@ -1,3 +1,4 @@\n one\n-two\n+two INVENTED\n four"
  const exit = await run(s)
  assert.match(unverifiedHunks(exit.value, diffText).join("\n"), /change.*f\.sh.*not in the diff/)
})

test("a hunk for a file the diff does not touch is reported", async () => {
  const s = prStory()
  s.blocks[1].hunks[0].path = "other.sh"
  const exit = await run(s)
  assert.match(unverifiedHunks(exit.value, diffText).join("\n"), /other\.sh/)
})

import { uncoveredHunks } from "../src/verify.ts"

const twoFileDiff = [
  "diff --git a/a.sh b/a.sh",
  "--- a/a.sh",
  "+++ b/a.sh",
  "@@ -1,2 +1,2 @@",
  "-x",
  "+y",
  " z",
  "@@ -10,2 +10,3 @@",
  " p",
  "+q",
  " r",
  "diff --git a/b.sh b/b.sh",
  "--- a/b.sh",
  "+++ b/b.sh",
  "@@ -1 +1 @@",
  "-m",
  "+n",
  "",
].join("\n")

const storyShowing = (hunks) => ({
  kind: "pr", revision: rev, title: "t", levels: [{ level: 0, name: "PR" }], edges: [],
  blocks: [{ _tag: "Diff", ...common("d", "review"), reason: "r", hunks, anchors: [anchor("a.sh", 1, 2)] }],
})

test("every hunk of the diff that the story never shows is listed", () => {
  const s = storyShowing([{ path: "a.sh", patch: "@@ -1,2 +1,2 @@\n-x\n+y\n z" }])
  assert.deepEqual(uncoveredHunks(s, twoFileDiff), ["a.sh @@ -10,2 +10,3 @@", "b.sh @@ -1 +1 @@"])
})

test("a story that shows every hunk leaves nothing uncovered", () => {
  const s = storyShowing([
    { path: "a.sh", patch: "@@ -1,2 +1,2 @@\n-x\n+y\n z" },
    { path: "a.sh", patch: "@@ -10,2 +10,3 @@\n p\n+q\n r" },
    { path: "b.sh", patch: "@@ -1 +1 @@\n-m\n+n" },
  ])
  assert.deepEqual(uncoveredHunks(s, twoFileDiff), [])
})
