/** The path data of a single-path icon svg. Throws if there is none, so a bad import fails at load, not as a blank button. */
export const pathOf = (svg: string): string => {
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1]
  if (d === undefined) throw new Error("Icon svg has no path")
  return d
}
