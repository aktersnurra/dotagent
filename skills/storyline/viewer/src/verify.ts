import type { Story } from "./story.ts"

const normalise = (text: string): string =>
  text.split("\n").map((line) => line.trimEnd()).join("\n").trim()

/** Hunks that the real diff does not contain. A story may reorder and explain a change, but not invent it. */
export const unverifiedHunks = (story: Story, diffText: string): ReadonlyArray<string> => {
  const diff = normalise(diffText)
  const problems: string[] = []
  for (const b of story.blocks) {
    if (b._tag !== "Diff") continue
    for (const h of b.hunks) {
      if (!diff.includes(`+++ b/${h.path}`) && !diff.includes(`--- a/${h.path}`)) {
        problems.push(`block "${b.id}": ${h.path} is not touched by the diff`)
      } else if (!diff.includes(normalise(h.patch))) {
        problems.push(`block "${b.id}": hunk for ${h.path} is not in the diff`)
      }
    }
  }
  return problems
}

interface DiffHunk { readonly path: string; readonly header: string }

const diffHunks = (diffText: string): ReadonlyArray<DiffHunk> => {
  const hunks: DiffHunk[] = []
  let path: string | undefined
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++ b/")) path = line.slice("+++ b/".length).trimEnd()
    else if (line.startsWith("--- a/") && path === undefined) path = line.slice("--- a/".length).trimEnd()
    else if (line.startsWith("diff --git ")) path = undefined
    else if (line.startsWith("@@") && path !== undefined) hunks.push({ path, header: line.trimEnd() })
  }
  return hunks
}

/** Hunks of the real diff that no block shows, as "path header". A reviewer should know what the story skips. */
export const uncoveredHunks = (story: Story, diffText: string): ReadonlyArray<string> => {
  const shown = new Set<string>()
  for (const b of story.blocks) {
    if (b._tag !== "Diff") continue
    for (const h of b.hunks) shown.add(`${h.path} ${normalise(h.patch).split("\n")[0]}`)
  }
  return diffHunks(diffText)
    .map((h) => `${h.path} ${h.header}`)
    .filter((key) => !shown.has(key))
}

const fileLines = (text: string): ReadonlyArray<string> => {
  const lines = text.split("\n")
  if (lines[lines.length - 1] === "") lines.pop()
  return lines
}

const sameCode = (a: string, b: ReadonlyArray<string>): boolean => {
  const left = fileLines(a.replace(/\n+$/, "\n")).map((l) => l.trimEnd())
  return left.length === b.length && left.every((l, i) => l === b[i]!.trimEnd())
}

/**
 * Anchors and quoted code checked against the files themselves. `read` returns a file's text at the
 * story's revision, or undefined when the file is not there. A story may explain code, but not misquote it.
 */
export const anchorProblems = (story: Story, read: (path: string) => string | undefined): ReadonlyArray<string> => {
  const problems: string[] = []
  for (const b of story.blocks) {
    b.anchors.forEach((a, i) => {
      const text = read(a.path)
      if (text === undefined) {
        problems.push(`block "${b.id}": ${a.path} does not exist at ${story.revision}`)
        return
      }
      const lines = fileLines(text)
      const where = `${a.path}:${a.startLine}-${a.endLine}`
      if (a.endLine > lines.length) {
        problems.push(`block "${b.id}": ${where} runs past the end of the file (${lines.length} lines)`)
      } else if (b._tag === "CodeRef" && i === 0 && !sameCode(b.code, lines.slice(a.startLine - 1, a.endLine))) {
        problems.push(`block "${b.id}": code does not match ${where} at ${story.revision}`)
      }
    })
  }
  return problems
}
