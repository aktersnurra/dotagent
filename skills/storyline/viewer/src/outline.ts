import type { Block, Story } from "./story.ts"

export type Row =
  | { readonly _tag: "Overview" }
  | { readonly _tag: "Heading"; readonly text: string }
  | { readonly _tag: "Item"; readonly block: Block; readonly depth: number; readonly step: number | undefined; readonly hasParts: boolean }

const partsOf = (story: Story, id: string): ReadonlyArray<Block> => story.blocks.filter((b) => b.parent === id)

/** A block followed by its parts, depth first. `skip` names blocks whose parts are left out. */
const walk = (story: Story, b: Block, depth: number, skip: ReadonlyArray<string>, step: number | undefined): ReadonlyArray<Row> => [
  { _tag: "Item", block: b, depth, step, hasParts: partsOf(story, b.id).length > 0 },
  ...(skip.includes(b.id) ? [] : partsOf(story, b.id).flatMap((c) => walk(story, c, depth + 1, skip, undefined))),
]

/** The rows of the left outline. PR stories read background first, then a numbered walkthrough. */
export const outlineRows = (story: Story, collapsed: ReadonlyArray<string>): ReadonlyArray<Row> => {
  const top = story.blocks.filter((b) => b.parent === undefined)
  if (story.kind === "codebase") return [{ _tag: "Overview" }, ...top.flatMap((b) => walk(story, b, 0, collapsed, undefined))]
  const background = top.filter((b) => b.section === "background")
  const review = top.filter((b) => b.section === "review")
  return [
    { _tag: "Overview" },
    { _tag: "Heading", text: "Background" },
    ...background.flatMap((b) => walk(story, b, 0, collapsed, undefined)),
    { _tag: "Heading", text: "Walkthrough" },
    ...review.flatMap((b, i) => walk(story, b, 0, collapsed, i + 1)),
  ]
}

/** Every block id in the order it is read, whatever is collapsed. */
export const readingOrder = (story: Story): ReadonlyArray<string> =>
  outlineRows(story, []).flatMap((r) => (r._tag === "Item" ? [r.block.id] : []))
