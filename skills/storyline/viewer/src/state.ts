import { Data, Match } from "effect"
import { Comment } from "./comment.ts"

export type View = "read" | "map"

export interface ViewerState {
  readonly view: View
  /** The block being read. Undefined is the overview. */
  readonly current: string | undefined
  /** Blocks opened at least once, in the order first opened. */
  readonly visited: ReadonlyArray<string>
  /** Outline entries whose parts are folded away. */
  readonly collapsed: ReadonlyArray<string>
  readonly comments: ReadonlyArray<Comment>
}

export const initialState: ViewerState = { view: "read", current: undefined, visited: [], collapsed: [], comments: [] }

export type Action = Data.TaggedEnum<{
  SetView: { readonly view: View }
  Go: { readonly id: string | undefined }
  ToggleCollapsed: { readonly id: string }
  /** Start a question about a passage of a block (an empty quote is the whole block). */
  OpenDraft: { readonly id: string; readonly blockId: string; readonly quote: string }
  RemoveThread: { readonly blockId: string; readonly quote: string }
  UpdateComment: { readonly comment: Comment }
  RemoveComment: { readonly id: string }
}>
export const Action = Data.taggedEnum<Action>()

export const reduce = (state: ViewerState, action: Action): ViewerState =>
  Match.value(action).pipe(
    Match.tagsExhaustive({
      SetView: ({ view }) => ({ ...state, view }),
      Go: ({ id }) => ({
        ...state,
        view: "read" as const,
        current: id,
        visited: id === undefined || state.visited.includes(id) ? state.visited : [...state.visited, id],
      }),
      ToggleCollapsed: ({ id }) => ({
        ...state,
        collapsed: state.collapsed.includes(id) ? state.collapsed.filter((x) => x !== id) : [...state.collapsed, id],
      }),
      // One thread per passage, and one open draft per thread. A draft left empty elsewhere is dropped.
      OpenDraft: ({ id, blockId, quote }) => {
        const kept = state.comments.filter((c) => !(c._tag === "Draft" && c.text.trim() === ""))
        let last = -1
        kept.forEach((c, i) => { if (c.blockId === blockId && c.quote === quote) last = i })
        if (last !== -1 && kept[last]!._tag === "Draft") return { ...state, comments: kept }
        const at = last === -1 ? kept.length : last + 1
        return { ...state, comments: [...kept.slice(0, at), Comment.Draft({ id, blockId, quote, text: "" }), ...kept.slice(at)] }
      },
      RemoveThread: ({ blockId, quote }) => ({ ...state, comments: state.comments.filter((c) => !(c.blockId === blockId && c.quote === quote)) }),
      UpdateComment: ({ comment }) => ({ ...state, comments: state.comments.map((c) => (c.id === comment.id ? comment : c)) }),
      RemoveComment: ({ id }) => ({ ...state, comments: state.comments.filter((c) => c.id !== id) }),
    }),
  )
