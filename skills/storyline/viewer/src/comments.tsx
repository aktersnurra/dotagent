import { useEffect, useRef } from "preact/hooks"
import { Match } from "effect"
import { reasonFor } from "./body.tsx"
import { Comment } from "./comment.ts"
import { Icon, type IconName } from "./icons.tsx"

const Act = (p: { icon: IconName; label: string; onClick?: () => void }) => (
  <button type="button" class="act" aria-label={p.label} title={p.label} onClick={p.onClick}><Icon name={p.icon} /></button>
)

/** Where the next question is typed: one box, with the send button inside it. */
const Composer = (p: { c: Extract<Comment, { _tag: "Draft" }>; first: boolean; onChange: (t: string) => void; onAsk: () => void; onClose: () => void }) => {
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { box.current?.focus({ preventScroll: true }) }, [p.c.id])
  // The box grows with the question.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [p.c.text])
  const ready = p.c.text.trim() !== ""
  return (
    <form class="composer" onSubmit={(ev) => { ev.preventDefault(); if (ready) p.onAsk() }}>
      <textarea ref={box} rows={1} aria-label={p.first ? "Question" : "Reply"} placeholder={p.first ? "Ask about this" : "Reply"} value={p.c.text}
        onInput={(ev) => p.onChange(ev.currentTarget.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); if (ready) p.onAsk() }
          else if (ev.key === "Escape") { ev.stopPropagation(); p.onClose() }
        }} />
      <button type="submit" class="send" aria-label="Send" title="Send (Enter)" disabled={!ready}><Icon name="arrowUpward" /></button>
    </form>
  )
}

export interface ThreadProps {
  readonly quote: string
  /** The questions about one passage, oldest first. At most the last one is still a draft. */
  readonly turns: ReadonlyArray<Comment>
  readonly onChange: (c: Comment, text: string) => void
  readonly onAsk: (c: Comment) => void
  readonly onClose: () => void
  readonly onRemove: () => void
}

/** One conversation about one passage: the passage, each question with its answer, and a box for the next one. */
export const Thread = (p: ThreadProps) => {
  const asked = p.turns.filter((c) => c._tag !== "Draft")
  const draft = p.turns.find((c) => c._tag === "Draft")
  const list = useRef<HTMLDivElement>(null)
  const last = asked.at(-1)
  const tail = last?._tag === "Pending" ? last.partial : last?._tag === "Answered" ? last.answer : ""
  // Keep the newest words in view inside the thread only. The page itself must stay where the reader put it.
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight }, [asked.length, tail])
  return (
    <div class="thread" role="dialog" aria-label="Questions about this passage">
      <div class="thread-head">
        {p.quote === "" ? <span /> : <blockquote class="quote">{p.quote}</blockquote>}
        {asked.length > 0 && <Act icon="delete" label="Delete this thread" onClick={p.onRemove} />}
        <Act icon="close" label="Close (Esc)" onClick={p.onClose} />
      </div>
      {asked.length > 0 && (
        <div class="turns" ref={list}>
          {asked.map((c) => (
            <div key={c.id} class="turn">
              <p class="q">{c.text}</p>
              {Match.value(c).pipe(
                Match.tagsExhaustive({
                  Pending: (d) => <p class="a streaming" aria-busy="true">{d.partial}</p>,
                  Answered: (d) => <p class="a">{d.answer}</p>,
                  Failed: (d) => (
                    <p class="a error">{reasonFor(d.error)}<Act icon="refresh" label="Try again" onClick={() => p.onAsk(d)} /></p>
                  ),
                }),
              )}
            </div>
          ))}
        </div>
      )}
      {draft?._tag === "Draft" && (
        <Composer c={draft} first={asked.length === 0} onChange={(t) => p.onChange(draft, t)} onAsk={() => p.onAsk(draft)} onClose={p.onClose} />
      )}
    </div>
  )
}
