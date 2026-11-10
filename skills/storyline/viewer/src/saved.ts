import { Data, Effect, Schema } from "effect"
import { Comment } from "./comment.ts"

/** A comment as it is kept on disk: the question, and the answer once there is one. */
const Saved = Schema.Struct({
  id: Schema.String,
  blockId: Schema.String,
  quote: Schema.String,
  text: Schema.String,
  answer: Schema.optionalKey(Schema.String),
})
type Saved = typeof Saved.Type

export class SavedInvalid extends Data.TaggedError("SavedInvalid")<{ readonly message: string }> {}

/** What to keep. A question that never got an answer is kept as the question alone; an empty draft is not kept. */
export const toSaved = (comments: ReadonlyArray<Comment>): ReadonlyArray<Saved> =>
  comments.flatMap((c): ReadonlyArray<Saved> => {
    const kept = { id: c.id, blockId: c.blockId, quote: c.quote, text: c.text }
    if (c._tag === "Answered") return [{ ...kept, answer: c.answer }]
    return c.text.trim() === "" ? [] : [kept]
  })

/** Decode once at the boundary. An unanswered question comes back as a draft, ready to ask again. */
export const fromSaved = (input: unknown): Effect.Effect<ReadonlyArray<Comment>, SavedInvalid> =>
  Schema.decodeUnknownEffect(Schema.Array(Saved))(input).pipe(
    Effect.mapError((e) => new SavedInvalid({ message: e.message })),
    Effect.map((saved) =>
      saved.map(({ answer, ...q }) => (answer === undefined ? Comment.Draft(q) : Comment.Answered({ ...q, answer }))),
    ),
  )
