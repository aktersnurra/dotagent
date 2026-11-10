import type { Line } from "./layout.ts"

/** An arrow drawn like a drawing: straight runs and right angles. `mid` is where its label sits. */
export const route = (l: Line): { readonly d: string; readonly mid: { readonly x: number; readonly y: number } } => {
  const { x1, y1, x2, y2 } = l
  if (l.via !== undefined) {
    const points = [{ x: x1, y: y1 }, ...l.via, { x: x2, y: y2 }]
    // The label sits on the longest run, where there is most room for it.
    let best = 0
    for (let i = 1; i + 1 < points.length; i++) {
      const len = (j: number) => Math.abs(points[j + 1]!.x - points[j]!.x) + Math.abs(points[j + 1]!.y - points[j]!.y)
      if (len(i) > len(best)) best = i
    }
    const p = points[best]!
    const q = points[best + 1]!
    return { d: `M${x1} ${y1} ${points.slice(1).map((v) => `L${v.x} ${v.y}`).join(" ")}`, mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } }
  }
  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  if (y1 === y2) return { d: `M${x1} ${y1} H${x2}`, mid }
  if (x1 === x2) return { d: `M${x1} ${y1} V${y2}`, mid }
  const sideways = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
  return {
    d: sideways ? `M${x1} ${y1} H${mid.x} V${y2} H${x2}` : `M${x1} ${y1} V${mid.y} H${x2} V${y2}`,
    mid,
  }
}
