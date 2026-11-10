/** screen = world * k + (x, y) */
export interface Viewport { readonly x: number; readonly y: number; readonly k: number }
export interface Point { readonly x: number; readonly y: number }
export interface Size { readonly width: number; readonly height: number }

export const MIN_K = 0.2
export const MAX_K = 2.5
/** Fit may enlarge small content to fill a big view, up to this. */
export const MAX_FIT = 1.6
export const clampK = (k: number): number => Math.min(MAX_K, Math.max(MIN_K, k))

export const toWorld = (vp: Viewport, screen: Point): Point => ({ x: (screen.x - vp.x) / vp.k, y: (screen.y - vp.y) / vp.k })

/** Zoom by `factor` around a screen point, so the world point under it stays put. */
export const zoomAt = (vp: Viewport, screen: Point, factor: number): Viewport => {
  const k = clampK(vp.k * factor)
  const ratio = k / vp.k
  return { k, x: screen.x - (screen.x - vp.x) * ratio, y: screen.y - (screen.y - vp.y) * ratio }
}

export const panBy = (vp: Viewport, dx: number, dy: number): Viewport => ({ ...vp, x: vp.x + dx, y: vp.y + dy })

/** Scale and centre `content` inside `view`, enlarging at most to MAX_FIT. */
export const fitTo = (content: Size, view: Size, padding = 48): Viewport => {
  const k = clampK(
    Math.min(MAX_FIT, (view.width - 2 * padding) / Math.max(1, content.width), (view.height - 2 * padding) / Math.max(1, content.height)),
  )
  return { k, x: (view.width - content.width * k) / 2, y: (view.height - content.height * k) / 2 }
}
