/** The section being read: the last one whose top has reached the reading line. Undefined above the first. */
export const sectionAt = (tops: ReadonlyArray<{ readonly id: string; readonly top: number }>, line: number): string | undefined => {
  let current: string | undefined
  for (const s of tops) {
    if (s.top > line) break
    current = s.id
  }
  return current
}
