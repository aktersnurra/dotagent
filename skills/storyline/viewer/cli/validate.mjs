// Usage: node validate.mjs <story.json> [--repo <dir>] [--diff <file.diff> [--allow-uncovered]]
// Exits 1 and lists every problem when the story is invalid, misquotes the repo at its revision (--repo),
// or contains hunks missing from the real diff (--diff).
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { Effect, Exit } from "effect"
import { loadStory } from "../src/story.ts"
import { anchorProblems, uncoveredHunks, unverifiedHunks } from "../src/verify.ts"

const [storyPath, ...rest] = process.argv.slice(2)
const diffIndex = rest.indexOf("--diff")
const diffPath = diffIndex === -1 ? undefined : rest[diffIndex + 1]
const repoIndex = rest.indexOf("--repo")
const repo = repoIndex === -1 ? undefined : rest[repoIndex + 1]
if (!storyPath || (diffIndex !== -1 && !diffPath) || (repoIndex !== -1 && !repo)) {
  console.error("usage: validate.mjs <story.json> [--repo <dir>] [--diff <file.diff> [--allow-uncovered]]")
  process.exit(2)
}

let raw
try {
  raw = JSON.parse(readFileSync(storyPath, "utf8"))
} catch (e) {
  console.error(`cannot read ${storyPath}: ${e.message}`)
  process.exit(1)
}

const exit = await Effect.runPromiseExit(loadStory(raw))
if (Exit.isFailure(exit)) {
  const problems = exit.cause.reasons.flatMap((r) => r.error?.problems ?? [String(r)])
  console.error(`invalid story (${problems.length}):\n- ${problems.join("\n- ")}`)
  process.exit(1)
}
const story = exit.value
if (repo) {
  // Read files as they are at the story's revision, through jj when the repo uses it and git otherwise.
  const command = existsSync(join(repo, ".jj"))
    ? (path) => ["jj", ["file", "show", "--ignore-working-copy", "-r", story.revision, "--", path]]
    : (path) => ["git", ["show", `${story.revision}:${path}`]]
  const seen = new Map()
  const read = (path) => {
    if (!seen.has(path)) {
      let text
      try { text = execFileSync(...command(path), { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) } catch {}
      seen.set(path, text)
    }
    return seen.get(path)
  }
  const wrong = anchorProblems(story, read)
  if (wrong.length > 0) {
    console.error(`anchors that do not match ${repo} at ${story.revision} (${wrong.length}):\n- ${wrong.join("\n- ")}`)
    process.exit(1)
  }
}
const missing = diffPath ? unverifiedHunks(story, readFileSync(diffPath, "utf8")) : []
if (missing.length > 0) {
  console.error(`hunks not found in ${diffPath} (${missing.length}):\n- ${missing.join("\n- ")}`)
  process.exit(1)
}
const skipped = diffPath && !rest.includes("--allow-uncovered") ? uncoveredHunks(story, readFileSync(diffPath, "utf8")) : []
if (skipped.length > 0) {
  console.error(`hunks in ${diffPath} that no block shows (${skipped.length}); show them or pass --allow-uncovered:\n- ${skipped.join("\n- ")}`)
  process.exit(1)
}
console.log(`ok: ${story.blocks.length} blocks, ${story.edges.length} edges${repo ? ", anchors match the repo" : ""}${diffPath ? ", hunks match the diff and cover it" : ""}`)
