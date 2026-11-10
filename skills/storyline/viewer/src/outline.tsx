import { Icon } from "./icons.tsx"
import { outlineRows } from "./outline.ts"
import type { Story } from "./story.ts"
import { Action, type ViewerState } from "./state.ts"

export const Outline = (p: { story: Story; state: ViewerState; unsaved: boolean; asking: boolean; onToggleAsk: () => void; onGo: (id: string | undefined) => void; dispatch: (a: Action) => void }) => {
  const rows = outlineRows(p.story, p.state.collapsed)
  const asked = new Set(p.state.comments.map((c) => c.blockId))
  return (
    <nav class="outline" aria-label="Outline">
      <button type="button" class="story" onClick={() => p.onGo(undefined)}>
        <span class="story-title">{p.story.title}</span>
        <span class="story-rev">{p.story.revision}</span>
      </button>
      <div class="tools">
        <button type="button" class="tool ask-toggle" aria-pressed={p.asking} aria-label="Ask about something" title="Ask: click anything in the story (a)" onClick={p.onToggleAsk}>
          <Icon name="comment" />
        </button>
        {p.story.kind === "codebase" && (
          <>
            <button type="button" class="tool" aria-pressed={p.state.view === "read"} aria-label="Read as a document" title="Document"
              onClick={() => p.dispatch(Action.SetView({ view: "read" }))}><Icon name="article" /></button>
            <button type="button" class="tool" aria-pressed={p.state.view === "map"} aria-label="Show as a map" title="Map"
              onClick={() => p.dispatch(Action.SetView({ view: "map" }))}><Icon name="accountTree" /></button>
          </>
        )}
      </div>
      <ul>
        {rows.map((r, i) => {
          if (r._tag === "Overview") return null
          if (r._tag === "Heading") return <li key={`h${i}`} class="heading">{r.text}</li>
          const id = r.block.id
          const folded = p.state.collapsed.includes(id)
          return (
            <li key={id} style={`--depth:${r.depth}`}>
              {r.hasParts
                ? <button type="button" class="fold" aria-expanded={!folded} aria-label={`${folded ? "Show" : "Hide"} parts of ${r.block.label}`}
                    onClick={() => p.dispatch(Action.ToggleCollapsed({ id }))}><Icon name="chevronRight" size={16} /></button>
                : <span class="fold-gap" />}
              <button type="button" class="row" aria-current={p.state.current === id} data-read={p.state.visited.includes(id)} data-kind={r.block._tag}
                onClick={() => p.onGo(id)}>
                <span class="mark" aria-hidden="true">{r.step ?? ""}</span>
                <span class="row-title">{r.block.label}</span>
                {asked.has(id) && <span class="asked" title="You asked about this" />}
              </button>
            </li>
          )
        })}
      </ul>
      {p.unsaved && <p class="unsaved" role="status">Notes are not being saved.</p>}
    </nav>
  )
}
