import type { Line } from "./layout.ts"

/** An arrow drawn like a drawing: straight runs and right angles. `mid` is where its label sits. */
export const route = (l: Line): { readonly d: string; readonly mid: { readonly x: number; readonly y: number } } => {
  const { x1, y1, x2, y2 } = l
  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  if (y1 === y2) return { d: `M${x1} ${y1} H${x2}`, mid }
  if (x1 === x2) return { d: `M${x1} ${y1} V${y2}`, mid }
  const sideways = Math.abs(x2 - x1) >= Math.abs(y2 - y1)
  return {
    d: sideways ? `M${x1} ${y1} H${mid.x} V${y2} H${x2}` : `M${x1} ${y1} V${mid.y} H${x2} V${y2}`,
    mid,
  }
}
