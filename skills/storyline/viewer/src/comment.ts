import { Data } from "effect"
import type { AskFailed } from "./asker.ts"

const MAX_QUOTE = 280

/** The text a reader selected, tidied for display and for the prompt. Nothing selected is no quote. */
export const cleanQuote = (raw: string): string | undefined => {
  const q = raw.replace(/\s+/g, " ").trim()
  if (q === "") return undefined
  return q.length <= MAX_QUOTE ? q : q.slice(0, MAX_QUOTE - 1).trimEnd() + "…"
}

/** Names the thread a comment belongs to: everything asked about one passage of one block. */
export const threadKey = (blockId: string, quote: string): string => `${blockId}\u0000${quote}`

/** A question about a block, optionally about a passage of it. An empty quote means the whole block. */
export type Comment = Data.TaggedEnum<{
  Draft: { readonly id: string; readonly blockId: string; readonly quote: string; readonly text: string }
  Pending: { readonly id: string; readonly blockId: string; readonly quote: string; readonly text: string; readonly partial: string }
  Answered: { readonly id: string; readonly blockId: string; readonly quote: string; readonly text: string; readonly answer: string }
  Failed: { readonly id: string; readonly blockId: string; readonly quote: string; readonly text: string; readonly error: AskFailed }
}>
export const Comment = Data.taggedEnum<Comment>()
