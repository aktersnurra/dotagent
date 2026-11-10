import { render } from "preact"
import { useEffect, useReducer, useRef, useState } from "preact/hooks"
import { Effect, Exit } from "effect"
import { Asker, AskFailed } from "./asker.ts"
import { promptFor } from "./body.tsx"
import { Canvas } from "./canvas.tsx"
import { Comment, cleanQuote, threadKey } from "./comment.ts"
import { Icon } from "./icons.tsx"
import { Outline } from "./outline.tsx"
import { findQuote } from "./mark.ts"
import { readingOrder } from "./outline.ts"
import { Document } from "./reading.tsx"
import { fromSaved, toSaved } from "./saved.ts"
import { sceneFor } from "./scene.ts"
import { sectionAt } from "./spy.ts"
import { Action, initialState, reduce } from "./state.ts"
import { loadStory, StoryInvalid, type Story } from "./story.ts"

type Theme = "light" | "dark"

/** The reader's earlier choice, or else what the system is set to. */
const startingTheme = (): Theme => {
  let saved: string | null = null
  try { saved = localStorage.getItem("storyline-theme") } catch { /* storage is off */ }
  if (saved === "light" || saved === "dark") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const App = ({ story, comments }: { story: Story; comments: ReadonlyArray<Comment> }) => {
  const [state, dispatch] = useReducer(reduce, { ...initialState, comments })
  const [unsaved, setUnsaved] = useState(false)
  const lastSaved = useRef(JSON.stringify(toSaved(comments)))

  // Comments are kept in a file beside the story, written shortly after they change.
  useEffect(() => {
    const body = JSON.stringify(toSaved(state.comments))
    if (body === lastSaved.current) return
    const timer = setTimeout(() => {
      fetch("/comments.json", { method: "PUT", body }).then(
        (res) => { if (res.ok) lastSaved.current = body; setUnsaved(!res.ok) },
        () => setUnsaved(true),
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [state.comments])
  const [asking, setAsking] = useState(false)
  const [sidebar, setSidebar] = useState(true)
  const [theme, setTheme] = useState<Theme>(startingTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem("storyline-theme", theme) } catch { /* private mode: the choice lasts for this visit */ }
  }, [theme])
  const flipTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"))
  // The one thread that is open, and where each thread's passage sits in its section.
  const [open, setOpen] = useState<{ blockId: string; quote: string } | undefined>()
  const [anchors, setAnchors] = useState<Readonly<Record<string, number>>>({})
  const openNow = useRef(open)
  openNow.current = open
  const pane = useRef<HTMLElement>(null)
  const current = useRef(state.current)
  const jumping = useRef(false)
  const landed = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  current.current = state.current

  const byId = new Map(story.blocks.map((b) => [b.id, b]))
  const order = readingOrder(story)
  const sectionOf = (id: string) => pane.current?.querySelector<HTMLElement>(`#${CSS.escape(`s-${id}`)}`)

  /** Move to a section, or to the top of the story. */
  const go = (id: string | undefined) => {
    dispatch(Action.Go({ id }))
    // Until the jump has landed, the place the reader asked for is the current one.
    jumping.current = true
    clearTimeout(landed.current)
    landed.current = setTimeout(() => { jumping.current = false }, 900)
    // The Map replaces the document, so wait for the document to be back before scrolling it.
    requestAnimationFrame(() => {
      if (id === undefined) pane.current?.scrollTo({ top: 0 })
      else sectionOf(id)?.scrollIntoView({ block: "start" })
    })
  }

  // The section at the top of the window is the one being read.
  useEffect(() => {
    const el = pane.current
    if (!el || state.view !== "read") return
    let frame = 0
    const spy = () => {
      frame = 0
      if (jumping.current) return
      const box = el.getBoundingClientRect()
      const line = box.top + box.height * 0.35
      const tops = [...el.querySelectorAll<HTMLElement>(".sec")].map((s) => ({ id: s.dataset.block!, top: s.getBoundingClientRect().top }))
      const id = sectionAt(tops, line)
      if (id !== current.current) dispatch(Action.Go({ id }))
    }
    const onScroll = () => { if (frame === 0) frame = requestAnimationFrame(spy) }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame) }
  }, [state.view])

  // j and k move through the story.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement
      if (ev.metaKey || ev.ctrlKey || ev.altKey || t.closest("textarea, input")) return
      const at = current.current === undefined ? -1 : order.indexOf(current.current)
      if (ev.key === "a") setAsking((on) => !on)
      else if (ev.key === "[") setSidebar((on) => !on)
      else if (ev.key === "t") flipTheme()
      else if (ev.key === "Escape") { if (openNow.current) closeThread(); else setAsking(false) }
      else if (ev.key === "j" && order[at + 1]) go(order[at + 1])
      else if (ev.key === "k" && at >= 0) go(order[at - 1])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // With Ask on, clicking a paragraph, a heading, a list item, a line of code or a file name asks about it.
  const askAbout = (ev: MouseEvent) => {
    if (!asking) return
    const el = (ev.target as Element).closest<HTMLElement>(".sec-body :is(h2, h3, p, li, .ln, .panel-head)")
    const blockId = el?.closest<HTMLElement>(".sec")?.dataset.block
    if (!el || !blockId) return
    ev.preventDefault()
    ev.stopPropagation()
    const copy = el.cloneNode(true) as HTMLElement
    copy.querySelectorAll(".no, .sign, .counts").forEach((n) => n.remove())
    openThread(blockId, cleanQuote(copy.textContent ?? "") ?? "")
  }

  // Passages the reader asked about stay marked in the text, and each thread sits level with its passage.
  useEffect(() => {
    if (state.view !== "read") return
    const ranges: Range[] = []
    const tops: Record<string, number> = {}
    for (const c of state.comments) {
      const key = threadKey(c.blockId, c.quote)
      const sec = sectionOf(c.blockId)
      const body = sec?.querySelector(".sec-body")
      if (key in tops || !sec || !body) continue
      tops[key] = 0
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      while (walker.nextNode()) nodes.push(walker.currentNode as Text)
      const found = findQuote(nodes.map((n) => n.data), c.quote)
      if (!found) continue
      const range = document.createRange()
      range.setStart(nodes[found.start.node]!, found.start.offset)
      range.setEnd(nodes[found.end.node]!, found.end.offset)
      ranges.push(range)
      tops[key] = Math.round(range.getBoundingClientRect().top - sec.getBoundingClientRect().top)
    }
    if ("highlights" in CSS) CSS.highlights.set("asked", new Highlight(...ranges))
    setAnchors((old) => (JSON.stringify(old) === JSON.stringify(tops) ? old : tops))
  }, [state.comments, state.view, sidebar])

  /** Open the thread about a passage, ready for a question. */
  const openThread = (blockId: string, quote: string) => {
    dispatch(Action.OpenDraft({ id: crypto.randomUUID(), blockId, quote }))
    setOpen({ blockId, quote })
  }

  /** Close the open thread. A question box left empty goes with it. */
  const closeThread = () => {
    const was = openNow.current
    if (!was) return
    const empty = state.comments.find((c) => c._tag === "Draft" && c.blockId === was.blockId && c.quote === was.quote && c.text.trim() === "")
    if (empty) dispatch(Action.RemoveComment({ id: empty.id }))
    setOpen(undefined)
  }

  const ask = (c: Comment) => {
    const b = byId.get(c.blockId)
    if (!b) return
    const { id, blockId, quote, text } = c
    const base = { id, blockId, quote, text }
    // What was already asked and answered about the same passage, so a follow-up has its context.
    const before = state.comments.slice(0, state.comments.findIndex((x) => x.id === id))
    const earlier = before.flatMap((x) => (x._tag === "Answered" && x.blockId === blockId && x.quote === quote ? [{ q: x.text, a: x.answer }] : []))
    const set = (comment: Comment) => dispatch(Action.UpdateComment({ comment }))
    set(Comment.Pending({ ...base, partial: "" }))
    const program = Effect.gen(function* () {
      const asker = yield* Asker
      return yield* asker.ask(promptFor(b, text, quote, earlier), (whole) => set(Comment.Pending({ ...base, partial: whole })))
    }).pipe(Effect.provide(window.claude ? Asker.artifact : Asker.local))
    void Effect.runPromiseExit(program).then((exit) => {
      // While the thread is still open, the next question can be typed straight away.
      const reopen = () => {
        const now = openNow.current
        if (now && now.blockId === blockId && now.quote === quote) dispatch(Action.OpenDraft({ id: crypto.randomUUID(), blockId, quote }))
      }
      if (Exit.isSuccess(exit)) { set(Comment.Answered({ ...base, answer: exit.value })); reopen(); return }
      const failure = exit.cause.reasons.find((r) => r._tag === "Fail")
      set(Comment.Failed({
        ...base,
        error: failure && failure._tag === "Fail" && failure.error instanceof AskFailed
          ? failure.error
          : new AskFailed({ code: "defect", message: "Unexpected failure.", partial: undefined }),
      }))
    })
  }

  return (
    <div class={`app${state.view === "map" ? " map" : ""}${asking ? " asking" : ""}${sidebar ? "" : " no-sidebar"}`}>
      <header class="bar">
        <button type="button" class="tool" aria-pressed={sidebar} aria-label="Outline" title="Outline ([)" onClick={() => setSidebar((on) => !on)}><Icon name="menu" /></button>
        <button type="button" class="bar-title" title="Back to the top" onClick={() => go(undefined)}>{story.title}</button>
        <code class="chip">{story.revision}</code>
        <span class="bar-space" />
        {story.kind === "codebase" && (
          <div class="seg" role="group" aria-label="View">
            <button type="button" class="tool" aria-pressed={state.view === "read"} aria-label="Read as a document" title="Document"
              onClick={() => dispatch(Action.SetView({ view: "read" }))}><Icon name="article" /></button>
            <button type="button" class="tool" aria-pressed={state.view === "map"} aria-label="Show as a map" title="Map"
              onClick={() => dispatch(Action.SetView({ view: "map" }))}><Icon name="accountTree" /></button>
          </div>
        )}
        <button type="button" class="tool" aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"} title={`${theme === "dark" ? "Light" : "Dark"} theme (t)`}
          onClick={flipTheme}><Icon name={theme === "dark" ? "lightMode" : "darkMode"} /></button>
        <button type="button" class="tool ask-toggle" aria-pressed={asking} aria-label="Ask about something" title="Ask: click anything in the story (a)"
          onClick={() => setAsking((on) => !on)}><Icon name="comment" /></button>
      </header>
      {sidebar && <Outline story={story} state={state} unsaved={unsaved} onGo={go} dispatch={dispatch} />}
      <main class="pane" ref={pane} onClickCapture={askAbout}>
        {state.view === "map"
          ? <Canvas scene={sceneFor(story, undefined)} partsOf={(id) => story.blocks.filter((b) => b.parent === id).length} onOpen={go} />
          : <Document story={story} comments={state.comments} onGo={go}
              open={open && threadKey(open.blockId, open.quote)} anchors={anchors}
              onOpen={openThread} onClose={closeThread}
              onRemoveThread={(blockId, quote) => { dispatch(Action.RemoveThread({ blockId, quote })); setOpen(undefined) }}
              onChange={(c, text) => dispatch(Action.UpdateComment({ comment: Comment.Draft({ id: c.id, blockId: c.blockId, quote: c.quote, text }) }))}
              onAsk={ask} />}
      </main>
    </div>
  )
}

const fetchStory = Effect.tryPromise({
  try: async (signal) => {
    const res = await fetch("/story.json", { signal })
    if (!res.ok) throw new Error(`The server has no story file (status ${res.status}).`)
    return (await res.json()) as unknown
  },
  catch: (e) => new StoryInvalid({ problems: [e instanceof Error ? e.message : String(e)] }),
}).pipe(Effect.flatMap(loadStory))

const fetchComments = Effect.tryPromise({
  try: async (signal) => {
    const res = await fetch("/comments.json", { signal })
    if (!res.ok) throw new Error(`the server answered ${res.status}`)
    return (await res.json()) as unknown
  },
  catch: (e) => (e instanceof Error ? e.message : String(e)),
}).pipe(
  Effect.flatMap((input) => fromSaved(input).pipe(Effect.mapError((e) => e.message))),
  // Opening anyway would overwrite the file on the next comment, so stop here instead.
  Effect.mapError((why) => new StoryInvalid({ problems: [`The saved comments beside the story (its .comments.json file) could not be read: ${why}. Fix or delete that file.`] })),
)

const root = document.getElementById("root")!
void Effect.runPromiseExit(Effect.all({ story: fetchStory, comments: fetchComments })).then((exit) => {
  root.replaceChildren() // drop the "Opening story…" placeholder; render() keeps existing children
  if (Exit.isSuccess(exit)) {
    document.title = exit.value.story.title
    render(<App story={exit.value.story} comments={exit.value.comments} />, root)
    return
  }
  const failure = exit.cause.reasons.find((r) => r._tag === "Fail")
  const problems = failure && failure._tag === "Fail" && failure.error instanceof StoryInvalid ? failure.error.problems : ["Unexpected failure."]
  render(
    <main class="state">
      <h1>This story can't be opened</h1>
      <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      <p class="meta">Run <code>validate.mjs</code> on the story file for the full list.</p>
    </main>,
    root,
  )
})
