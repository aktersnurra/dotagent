import { Match } from "effect"
import type { Block } from "./story.ts"

const LINES = 3
const STEPS = 3

export type Preview =
  | { readonly _tag: "None" }
  | { readonly _tag: "Steps"; readonly items: ReadonlyArray<string>; readonly more: number }
  | { readonly _tag: "Code"; readonly lines: ReadonlyArray<string> }
  | { readonly _tag: "Changes"; readonly lines: ReadonlyArray<{ readonly sign: "+" | "-"; readonly text: string }> }

/** What a node shows of its block on the canvas, without opening it. */
export const previewOf = (b: Block): Preview =>
  Match.value(b).pipe(
    Match.tagsExhaustive({
      Summary: (): Preview => ({ _tag: "None" }),
      Concept: (): Preview => ({ _tag: "None" }),
      Risk: (): Preview => ({ _tag: "None" }),
      Flow: (f): Preview => ({ _tag: "Steps", items: f.steps.slice(0, STEPS), more: Math.max(0, f.steps.length - STEPS) }),
      CodeRef: (c): Preview => ({ _tag: "Code", lines: c.code.split("\n").filter((l) => l.trim() !== "").slice(0, LINES) }),
      Diff: (d): Preview => {
        const lines: Array<{ sign: "+" | "-"; text: string }> = []
        for (const h of d.hunks) {
          for (const line of h.patch.split("\n")) {
            if (lines.length === LINES) break
            if (line.startsWith("+++") || line.startsWith("---")) continue
            if (line.startsWith("+") || line.startsWith("-")) lines.push({ sign: line[0] as "+" | "-", text: line.slice(1) })
          }
        }
        return { _tag: "Changes", lines }
      },
    }),
  )

/** The word on a node's header strip. */
export const kindName = (b: Block): string =>
  Match.value(b).pipe(
    Match.tagsExhaustive({
      Summary: () => "Summary",
      Concept: () => "Concept",
      Flow: () => "Flow",
      CodeRef: () => "Code",
      Diff: () => "Diff",
      Risk: () => "Risk",
    }),
  )
