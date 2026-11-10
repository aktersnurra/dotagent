export const NODE_W = 150
export const NODE_H = 40

export interface Placed { readonly id: string; readonly x: number; readonly y: number }
export interface Line { readonly from: string; readonly to: string; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly label?: string }
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
  // Along a layer: members side by side. Across layers: one step per layer.
  const memberSpan = (n: number) => (right ? n * h + (n - 1) * gapY : n * w + (n - 1) * gapX)
  const alongMax = memberSpan(widest)
  const nodes: Placed[] = []
  for (const [l, members] of layers) {
    const offset = (alongMax - memberSpan(members.length)) / 2
    members.forEach((id, i) => {
      nodes.push(
        right
          ? { id, x: l * (w + gapX), y: offset + i * (h + gapY) }
          : { id, x: offset + i * (w + gapX), y: l * (h + gapY) },
      )
    })
  }
  const at = new Map(nodes.map((n) => [n.id, n]))
  const lines = live.map((e) => connect(at.get(e.from)!, at.get(e.to)!, w, h))
  const across = layerCount === 0 ? 0 : right ? layerCount * w + (layerCount - 1) * gapX : layerCount * h + (layerCount - 1) * gapY
  return { nodes, lines, width: right ? across : alongMax, height: right ? alongMax : across }
}
