export const NODE_W = 150
export const NODE_H = 40

export interface Placed { readonly id: string; readonly x: number; readonly y: number }
export interface Point { readonly x: number; readonly y: number }
export interface Line {
  readonly from: string; readonly to: string
  readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number
  /** Corners the line turns at between its ends, in order. Every run between them is horizontal or vertical. */
  readonly via?: ReadonlyArray<Point>
  readonly label?: string
}
export interface Layout {
  readonly nodes: ReadonlyArray<Placed>
  readonly lines: ReadonlyArray<Line>
  readonly width: number
  readonly height: number
}
export interface LayoutOptions {
  readonly nodeW?: number
  readonly nodeH?: number
  readonly gapX?: number
  readonly gapY?: number
  /** "down": layers are rows. "right": layers are columns. */
  readonly direction?: "down" | "right"
}

/** A line between two boxes, leaving and entering at the sides that face each other. */
export const connect = (a: Placed, b: Placed, w: number, h: number): Line => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    const right = dx >= 0
    return { from: a.id, to: b.id, x1: a.x + (right ? w : 0), y1: a.y + h / 2, x2: b.x + (right ? 0 : w), y2: b.y + h / 2 }
  }
  const down = dy > 0
  return { from: a.id, to: b.id, x1: a.x + w / 2, y1: a.y + (down ? h : 0), x2: b.x + w / 2, y2: b.y + (down ? 0 : h) }
}

/** Layered layout: a node sits one layer after the deepest node that points at it. Cycles stop at n layers. */
export const layout = (
  ids: ReadonlyArray<string>,
  edges: ReadonlyArray<{ readonly from: string; readonly to: string }>,
  options: LayoutOptions = {},
): Layout => {
  const w = options.nodeW ?? NODE_W
  const h = options.nodeH ?? NODE_H
  const gapX = options.gapX ?? 24
  const gapY = options.gapY ?? 48
  const right = options.direction === "right"

  const known = new Set(ids)
  const live = edges.filter((e) => e.from !== e.to && known.has(e.from) && known.has(e.to))
  const layer = new Map(ids.map((id) => [id, 0]))
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false
    for (const e of live) {
      const next = Math.min((layer.get(e.from) ?? 0) + 1, ids.length - 1)
      if (next > (layer.get(e.to) ?? 0)) { layer.set(e.to, next); changed = true }
    }
    if (!changed) break
  }
  const layers = new Map<number, string[]>()
  for (const id of ids) {
    const l = layer.get(id) ?? 0
    layers.set(l, [...(layers.get(l) ?? []), id])
  }
  const layerCount = layers.size === 0 ? 0 : Math.max(...layers.keys()) + 1
  const widest = Math.max(1, ...[...layers.values()].map((m) => m.length))

  // Work in two axes whatever the direction: `across` runs from layer to layer, `along` runs inside a layer.
  const size = right ? w : h
  const gap = right ? gapX : gapY
  const span = right ? h : w
  const spanGap = right ? gapY : gapX
  const alongMax = widest * span + (widest - 1) * spanGap
  const cell = new Map<string, { readonly layer: number; readonly along: number }>()
  for (const [l, members] of layers) {
    const offset = (alongMax - (members.length * span + (members.length - 1) * spanGap)) / 2
    members.forEach((id, i) => cell.set(id, { layer: l, along: offset + i * (span + spanGap) }))
  }
  const startOf = (l: number) => l * (size + gap)

  // An arrow to the next layer bends in the gap between the two layers. Any other arrow would have to pass
  // the layers in between, so it goes round them on a rail outside the drawing. Each gets a lane of its own.
  const LANE = 14
  const neighbours = live.filter((e) => cell.get(e.to)!.layer === cell.get(e.from)!.layer + 1)
  const detours = live.filter((e) => !neighbours.includes(e))
  const centre = (id: string) => cell.get(id)!.along + span / 2
  const before: typeof detours = []
  const after: typeof detours = []
  for (const e of detours) ((centre(e.from) + centre(e.to)) / 2 <= alongMax / 2 ? before : after).push(e)
  const padAlong = before.length === 0 ? 0 : (before.length + 1) * LANE
  const padAfter = after.length === 0 ? 0 : (after.length + 1) * LANE
  const backToFirst = detours.some((e) => cell.get(e.to)!.layer === 0)
  const padAcross = backToFirst ? gap : 0
  const padEnd = detours.some((e) => cell.get(e.from)!.layer === layerCount - 1) ? gap : 0

  const point = (across: number, along: number): Point =>
    right ? { x: across + padAcross, y: along + padAlong } : { x: along + padAlong, y: across + padAcross }
  const nodes: Placed[] = ids.map((id) => {
    const c = cell.get(id)!
    return { id, ...point(startOf(c.layer), c.along) }
  })

  const lines = live.map((e): Line => {
    const a = cell.get(e.from)!
    const b = cell.get(e.to)!
    const out = startOf(a.layer) + size
    const into = startOf(b.layer)
    const from = point(out, centre(e.from))
    const to = point(into, centre(e.to))
    const ends = { from: e.from, to: e.to, x1: from.x, y1: from.y, x2: to.x, y2: to.y }
    if (neighbours.includes(e)) {
      if (centre(e.from) === centre(e.to)) return ends
      // Arrows from the same block share a lane, so they leave it as one line and part in the gap.
      const sources = [...new Set(neighbours.filter((x) => cell.get(x.from)!.layer === a.layer).map((x) => x.from))]
      const step = Math.min(LANE, (gap * 0.3) / sources.length)
      const bend = out + gap / 2 + (sources.indexOf(e.from) - (sources.length - 1) / 2) * step
      return { ...ends, via: [point(bend, centre(e.from)), point(bend, centre(e.to))] }
    }
    const rail = before.includes(e) ? -(before.indexOf(e) + 1) * LANE : alongMax + (after.indexOf(e) + 1) * LANE
    // Leaving and arriving runs keep to their own side of the gap, clear of each other and of the bends in the middle.
    const leave = out + gap / 4
    const arrive = into - gap / 4
    return { ...ends, via: [point(leave, centre(e.from)), point(leave, rail), point(arrive, rail), point(arrive, centre(e.to))] }
  })

  const across = layerCount === 0 ? 0 : layerCount * size + (layerCount - 1) * gap + padAcross + padEnd
  const along = alongMax + padAlong + padAfter
  return { nodes, lines, width: right ? across : along, height: right ? along : across }
}
