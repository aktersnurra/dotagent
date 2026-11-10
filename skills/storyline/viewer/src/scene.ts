import { connect, layout, type Line, type Placed } from "./layout.ts"
import type { Block, Story } from "./story.ts"

export const NODE_W = 280
export const NODE_H = 244
const GAP_X = 96
const GAP_Y = 56
const BACKGROUND_PER_ROW = 3
const GRID_PER_ROW = 3
const REVIEW_PER_ROW = 4
const LABEL_H = 28

export interface SceneNode { readonly block: Block; readonly x: number; readonly y: number; readonly step?: number }
export interface SceneLabel { readonly text: string; readonly x: number; readonly y: number }
export interface Scene {
  readonly nodes: ReadonlyArray<SceneNode>
  readonly lines: ReadonlyArray<Line>
  readonly labels: ReadonlyArray<SceneLabel>
  readonly width: number
  readonly height: number
}

const RELATION = { calls: "calls", depends: "depends on", "reads-before": "read first", changes: "changes" } as const

/** Fill rows of PER_ROW from the left, starting at y0. */
const rows = (ids: ReadonlyArray<string>, y0: number, perRow: number): ReadonlyArray<Placed> =>
  ids.map((id, i) => ({ id, x: (i % perRow) * (NODE_W + GAP_X), y: y0 + Math.floor(i / perRow) * (NODE_H + GAP_Y) }))

const extent = (placed: ReadonlyArray<Placed>) => ({
  width: Math.max(0, ...placed.map((p) => p.x + NODE_W)),
  height: Math.max(0, ...placed.map((p) => p.y + NODE_H)),
})

const build = (
  blocks: ReadonlyArray<Block>,
  placed: ReadonlyArray<Placed>,
  lines: ReadonlyArray<Line>,
  labels: ReadonlyArray<SceneLabel>,
  steps: ReadonlyMap<string, number>,
): Scene => {
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const nodes = placed.map((p): SceneNode => {
    const step = steps.get(p.id)
    return step === undefined ? { block: byId.get(p.id)!, x: p.x, y: p.y } : { block: byId.get(p.id)!, x: p.x, y: p.y, step }
  })
  const { width, height } = extent(placed)
  return { nodes, lines, labels, width, height }
}

/** What the canvas shows for one level: the blocks under `parent`, placed, with their arrows. */
export const sceneFor = (story: Story, parent: string | undefined): Scene => {
  const blocks = story.blocks.filter((b) => b.parent === parent)

  if (parent === undefined && story.kind === "pr") {
    const background = blocks.filter((b) => b.section === "background")
    const review = blocks.filter((b) => b.section === "review")
    const bgPlaced = rows(background.map((b) => b.id), LABEL_H, BACKGROUND_PER_ROW)
    const bgBottom = extent(bgPlaced).height
    const reviewTop = bgBottom + GAP_Y + LABEL_H
    const reviewPlaced = rows(review.map((b) => b.id), reviewTop, REVIEW_PER_ROW)
    const at = new Map(reviewPlaced.map((p) => [p.id, p]))
    const lines = review.slice(1).map((b, i) => connect(at.get(review[i]!.id)!, at.get(b.id)!, NODE_W, NODE_H))
    const labels: SceneLabel[] = [
      { text: "Before you read the change", x: 0, y: 0 },
      { text: "Walkthrough", x: 0, y: reviewTop - LABEL_H },
    ]
    const steps = new Map(review.map((b, i) => [b.id, i + 1]))
    return build(blocks, [...bgPlaced, ...reviewPlaced], lines, labels, steps)
  }

  const ids = blocks.map((b) => b.id)
  const edges = story.edges.filter((e) => ids.includes(e.from) && ids.includes(e.to))
  if (edges.length === 0) return build(blocks, rows(ids, 0, GRID_PER_ROW), [], [], new Map())
  const lay = layout(ids, edges, { direction: "right", nodeW: NODE_W, nodeH: NODE_H, gapX: GAP_X, gapY: GAP_Y / 2 })
  const labelled = lay.lines.map((l): Line => {
    const e = edges.find((x) => x.from === l.from && x.to === l.to)
    return e ? { ...l, label: RELATION[e.kind] } : l
  })
  return build(blocks, lay.nodes, labelled, [], new Map())
}
