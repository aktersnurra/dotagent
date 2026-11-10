export interface Spot { readonly node: number; readonly offset: number }

/**
 * Where a quoted passage sits in a run of text pieces, so it can be marked. Whitespace is ignored on both
 * sides, because a selection copied across paragraphs does not keep the spacing of the page.
 */
export const findQuote = (texts: ReadonlyArray<string>, quote: string): { readonly start: Spot; readonly end: Spot } | undefined => {
  const wanted = quote.replace(/…$/, "").replace(/\s+/g, "")
  if (wanted === "") return undefined
  let squeezed = ""
  const spots: Spot[] = []
  texts.forEach((text, node) => {
    for (let offset = 0; offset < text.length; offset++) {
      if (/\s/.test(text[offset]!)) continue
      squeezed += text[offset]
      spots.push({ node, offset })
    }
  })
  const at = squeezed.indexOf(wanted)
  if (at === -1) return undefined
  const last = spots[at + wanted.length - 1]!
  return { start: spots[at]!, end: { node: last.node, offset: last.offset + 1 } }
}
