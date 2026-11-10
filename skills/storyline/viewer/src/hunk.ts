export type HunkLine =
  | { readonly kind: "hdr"; readonly text: string }
  | { readonly kind: "note"; readonly text: string }
  | { readonly kind: "ctx"; readonly text: string; readonly old: number; readonly new: number }
  | { readonly kind: "del"; readonly text: string; readonly old: number }
  | { readonly kind: "add"; readonly text: string; readonly new: number }

/** The lines of one hunk, each with the line number it has before and after the change. */
export const hunkLines = (patch: string): ReadonlyArray<HunkLine> => {
  const raw = patch.split("\n")
  if (raw[raw.length - 1] === "") raw.pop()
  const out: HunkLine[] = []
  let old = 0
  let next = 0
  for (const line of raw) {
    if (line.startsWith("@@")) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line)
      old = Number(m?.[1] ?? 0)
      next = Number(m?.[2] ?? 0)
      out.push({ kind: "hdr", text: line })
    } else if (line.startsWith("\\")) out.push({ kind: "note", text: line.slice(1).trim() })
    else if (line.startsWith("+")) out.push({ kind: "add", text: line.slice(1), new: next++ })
    else if (line.startsWith("-")) out.push({ kind: "del", text: line.slice(1), old: old++ })
    else out.push({ kind: "ctx", text: line.slice(1), old: old++, new: next++ })
  }
  return out
}
