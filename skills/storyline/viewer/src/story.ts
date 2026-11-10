import { Data, Effect, Schema } from "effect"

export const Anchor = Schema.Struct({
  path: Schema.String,
  startLine: Schema.Int,
  endLine: Schema.Int,
  revision: Schema.String,
})
export type Anchor = typeof Anchor.Type

const common = {
  id: Schema.String,
  /** Short noun for the graph node. */
  label: Schema.String,
  /** One-sentence heading for the card. */
  title: Schema.String,
  summary: Schema.String,
  level: Schema.Int,
  parent: Schema.optionalKey(Schema.String),
  /** PR stories only, on top-level blocks: background to read first, then the reviewed change. */
  section: Schema.optionalKey(Schema.Literals(["background", "review"])),
}

// A claim about code needs an anchor. Summary and Concept may speak generally, so their anchors may be empty.
const Summary = Schema.TaggedStruct("Summary", { ...common, anchors: Schema.Array(Anchor) })
const Concept = Schema.TaggedStruct("Concept", { ...common, anchors: Schema.Array(Anchor) })
const Flow = Schema.TaggedStruct("Flow", {
  ...common,
  steps: Schema.NonEmptyArray(Schema.String),
  anchors: Schema.NonEmptyArray(Anchor),
})
const CodeRef = Schema.TaggedStruct("CodeRef", {
  ...common,
  code: Schema.String,
  anchors: Schema.NonEmptyArray(Anchor),
})

const Hunk = Schema.Struct({
  path: Schema.String,
  /** One hunk exactly as `diff --git` prints it, starting at its `@@` header. */
  patch: Schema.String,
})
// A piece of the change, placed where it should be read. `reason` says why it sits at this position.
const Diff = Schema.TaggedStruct("Diff", {
  ...common,
  reason: Schema.String,
  hunks: Schema.NonEmptyArray(Hunk),
  anchors: Schema.NonEmptyArray(Anchor),
})
// Something the reviewer should look at closely.
const Risk = Schema.TaggedStruct("Risk", {
  ...common,
  severity: Schema.Literals(["low", "medium", "high"]),
  anchors: Schema.NonEmptyArray(Anchor),
})

export const Block = Schema.Union([Summary, Concept, Flow, CodeRef, Diff, Risk])
export type Block = typeof Block.Type

export const Edge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  kind: Schema.Literals(["calls", "depends", "reads-before", "changes"]),
})
export type Edge = typeof Edge.Type

export const Story = Schema.Struct({
  kind: Schema.Literals(["codebase", "pr"]),
  revision: Schema.String,
  title: Schema.String,
  levels: Schema.Array(Schema.Struct({ level: Schema.Int, name: Schema.String })),
  blocks: Schema.NonEmptyArray(Block),
  edges: Schema.Array(Edge),
})
export type Story = typeof Story.Type

export class StoryInvalid extends Data.TaggedError("StoryInvalid")<{
  readonly problems: ReadonlyArray<string>
}> {}

/** Rules the shape alone cannot express: unique ids, real parents and edge ends, pinned revision. */
export const integrityProblems = (story: Story): ReadonlyArray<string> => {
  const problems: string[] = []
  const byId = new Map<string, Block>()
  for (const b of story.blocks) {
    if (byId.has(b.id)) problems.push(`duplicate block id "${b.id}"`)
    byId.set(b.id, b)
  }
  for (const b of story.blocks) {
    if (b.level < 0) problems.push(`block "${b.id}" has a negative level`)
    if (b.parent === undefined) {
      if (b.level !== 0) problems.push(`block "${b.id}" is at level ${b.level} but has no parent`)
    } else {
      const p = byId.get(b.parent)
      if (!p) problems.push(`block "${b.id}" has unknown parent "${b.parent}"`)
      else if (p.level !== b.level - 1) problems.push(`block "${b.id}" must be one level below its parent "${p.id}"`)
    }
    if (b.section !== undefined && b.level !== 0) problems.push(`block "${b.id}" is not top-level and cannot have a section`)
    if (story.kind === "pr" && b.level === 0 && b.section === undefined) {
      problems.push(`top-level block "${b.id}" of a PR story needs a section`)
    }
    if (story.kind === "codebase" && b.section !== undefined) {
      problems.push(`block "${b.id}" has a section, but only PR stories use sections`)
    }
    if (b._tag === "Diff") {
      for (const h of b.hunks) {
        if (!h.patch.startsWith("@@")) problems.push(`block "${b.id}" has a hunk for ${h.path} that does not start with a hunk header`)
      }
    }
    for (const a of b.anchors) {
      if (a.startLine < 1 || a.endLine < a.startLine) {
        problems.push(`block "${b.id}" has a bad line range ${a.path}:${a.startLine}-${a.endLine}`)
      }
      if (a.revision !== story.revision) {
        problems.push(`block "${b.id}" anchors ${a.path} at ${a.revision}, not the story revision ${story.revision}`)
      }
    }
  }
  for (const e of story.edges) {
    const from = byId.get(e.from)
    const to = byId.get(e.to)
    if (!from) problems.push(`edge starts at unknown block "${e.from}"`)
    if (!to) problems.push(`edge ends at unknown block "${e.to}"`)
    if (from && to && (from.level !== to.level || from.parent !== to.parent)) {
      problems.push(`edge ${e.from} -> ${e.to} joins blocks that are not siblings`)
    }
  }
  return problems
}

/** Decode once at the boundary. Everything past this point works with a valid Story. */
export const loadStory = (input: unknown): Effect.Effect<Story, StoryInvalid> =>
  Schema.decodeUnknownEffect(Story)(input).pipe(
    Effect.mapError((e) => new StoryInvalid({ problems: [e.message] })),
    Effect.flatMap((story) => {
      const problems = integrityProblems(story)
      return problems.length === 0 ? Effect.succeed(story) : Effect.fail(new StoryInvalid({ problems }))
    }),
  )
