import { useEffect, useRef } from "preact/hooks"
import { Match } from "effect"
import { reasonFor } from "./body.tsx"
import { Comment } from "./comment.ts"
import { Icon, type IconName } from "./icons.tsx"

const Act = (p: { icon: IconName; label: string; onClick?: () => void; submit?: boolean; disabled?: boolean }) => (
  <button type={p.submit ? "submit" : "button"} class="act" aria-label={p.label} title={p.label} disabled={p.disabled ?? false} onClick={p.onClick}>
    <Icon name={p.icon} />
  </button>
)

const Draft = (p: { c: Extract<Comment, { _tag: "Draft" }>; onChange: (t: string) => void; onAsk: () => void; onCancel: () => void }) => {
  const box = useRef<HTMLTextAreaElement>(null)
  // A new question takes the cursor. One restored from an earlier visit does not, or opening the story would jump to it.
  useEffect(() => { if (p.c.text === "") box.current?.focus({ preventScroll: true }) }, [])
  const ready = p.c.text.trim() !== ""
  return (
    <form class="turn" onSubmit={(ev) => { ev.preventDefault(); if (ready) p.onAsk() }}>
      <textarea ref={box} aria-label="Question" rows={2} value={p.c.text} onInput={(ev) => p.onChange(ev.currentTarget.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" && !ev.shiftKey && ready) { ev.preventDefault(); p.onAsk() }
          else if (ev.key === "Escape") { ev.stopPropagation(); p.onCancel() }
        }} />
      <div class="actions">
        <Act icon="arrowUpward" label="Send (Enter)" submit disabled={!ready} />
        <Act icon="close" label="Cancel (Esc)" onClick={p.onCancel} />
      </div>
    </form>
  )
}

export interface ThreadProps {
  readonly quote: string
  /** The questions about one passage, oldest first. At most the last one is still a draft. */
  readonly turns: ReadonlyArray<Comment>
  readonly onChange: (c: Comment, text: string) => void
  readonly onAsk: (c: Comment) => void
  readonly onReply: () => void
  readonly onCancel: (c: Comment) => void
  readonly onRemove: () => void
}

/** One conversation about one passage: the passage, then each question with its answer, then room to reply. */
export const Thread = (p: ThreadProps) => {
  const last = p.turns[p.turns.length - 1]
  return (
    <div class="thread" data-quote={p.quote}>
      <div class="thread-head">
        {p.quote === "" ? <span /> : <blockquote class="quote">{p.quote}</blockquote>}
        <Act icon="close" label="Remove this thread" onClick={p.onRemove} />
      </div>
      {p.turns.map((c) =>
        Match.value(c).pipe(
          Match.tagsExhaustive({
            Draft: (d) => <Draft key={d.id} c={d} onChange={(t) => p.onChange(d, t)} onAsk={() => p.onAsk(d)} onCancel={() => p.onCancel(d)} />,
            Pending: (d) => (
              <div key={d.id} class="turn" aria-busy="true">
                <p class="q">{d.text}</p>
                <p class="a">{d.partial === "" ? "…" : d.partial}</p>
              </div>
            ),
            Answered: (d) => (
              <div key={d.id} class="turn">
                <p class="q">{d.text}</p>
                <p class="a">{d.answer}</p>
              </div>
            ),
            Failed: (d) => (
              <div key={d.id} class="turn">
                <p class="q">{d.text}</p>
                <p class="a error">{reasonFor(d.error)}</p>
                <div class="actions"><Act icon="refresh" label="Try again" onClick={() => p.onAsk(d)} /></div>
              </div>
            ),
          }),
        ),
      )}
      {last?._tag === "Answered" && <div class="actions"><Act icon="reply" label="Reply" onClick={p.onReply} /></div>}
    </div>
  )
}
