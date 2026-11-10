import { Body, anchorText, showsAnchorInPanel } from "./body.tsx"
import type { Comment } from "./comment.ts"
import { Thread } from "./comments.tsx"
import { outlineRows } from "./outline.ts"
import type { Block, Story } from "./story.ts"

const ahead = { calls: "calls", depends: "depends on", "reads-before": "is read before", changes: "changes" } as const
const behind = { calls: "called by", depends: "needed by", "reads-before": "is read after", changes: "changed by" } as const

export interface NoteHandlers {
  readonly onOpen: (blockId: string, quote: string) => void
  readonly onRemoveThread: (blockId: string, quote: string) => void
  readonly onChange: (c: Comment, text: string) => void
  readonly onAsk: (c: Comment) => void
  readonly onDiscard: (c: Comment) => void
}

interface SectionProps extends NoteHandlers {
  readonly story: Story
  readonly block: Block
  readonly depth: number
  readonly step: number | undefined
  readonly notes: ReadonlyArray<Comment>
  readonly onGo: (id: string) => void
}

/** One section of the story, with the reader's questions about it alongside. */
const Section = (p: SectionProps) => {
  const b = p.block
  const links = p.story.edges.flatMap((e): ReadonlyArray<{ id: string; text: string }> => {
    if (e.from === b.id) return [{ id: e.to, text: ahead[e.kind] }]
    if (e.to === b.id) return [{ id: e.from, text: behind[e.kind] }]
    return []
  })
  const Title = p.depth === 0 ? "h2" : "h3"
  return (
    <section class="sec" id={`s-${b.id}`} data-block={b.id} data-kind={b._tag} style={`--depth:${p.depth}`}>
      <div class="sec-body">
        {p.step !== undefined && <span class="num" aria-hidden="true">{p.step}</span>}
        {b._tag === "Risk" && <p class={`severity ${b.severity}`}>{b.severity[0]!.toUpperCase() + b.severity.slice(1)} risk</p>}
        <Title>{b.title}</Title>
        <p class="summary">{b.summary}</p>
        <Body b={b} />
        {b.anchors.length > 0 && !showsAnchorInPanel(b) && <p class="anchor">{anchorText(b)}</p>}
        {links.length > 0 && (
          <ul class="links">
            {links.map((l) => {
              const other = p.story.blocks.find((x) => x.id === l.id)
              return other && (
                <li key={`${l.id}${l.text}`}>
                  <span class="rel">{l.text}</span>
                  <button type="button" class="link" onClick={() => p.onGo(l.id)}>{other.title}</button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <aside class="sec-notes" aria-label={`Questions about ${b.label}`}>
        {[...new Set(p.notes.map((c) => c.quote))].map((quote) => (
          <Thread key={quote} quote={quote} turns={p.notes.filter((c) => c.quote === quote)}
            onChange={p.onChange} onAsk={p.onAsk} onCancel={p.onDiscard}
            onReply={() => p.onOpen(b.id, quote)} onRemove={() => p.onRemoveThread(b.id, quote)} />
        ))}
      </aside>
    </section>
  )
}

/** The whole story as one document, read from the top. */
export const Document = (p: { story: Story; comments: ReadonlyArray<Comment>; onGo: (id: string) => void } & NoteHandlers) => {
  const { story } = p
  return (
    <article class="doc">
      <header class="masthead">
        <p class="kind"><code>{story.revision}</code></p>
        <h1>{story.title}</h1>
      </header>
      {outlineRows(story, []).map((r) =>
        r._tag === "Overview" ? null
        : r._tag === "Heading" ? <p key={r.text} class="part">{r.text}</p>
        : <Section key={r.block.id} story={story} block={r.block} depth={r.depth} step={r.step}
            notes={p.comments.filter((c) => c.blockId === r.block.id)}
            onGo={p.onGo} onOpen={p.onOpen} onRemoveThread={p.onRemoveThread} onChange={p.onChange} onAsk={p.onAsk} onDiscard={p.onDiscard} />,
      )}
    </article>
  )
}
