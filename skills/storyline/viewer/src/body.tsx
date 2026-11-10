import { Match } from "effect"
import type { AskFailed } from "./asker.ts"
import { hunkLines } from "./hunk.ts"
import type { Block } from "./story.ts"

export const anchorText = (b: Block) => b.anchors.map((a) => `${a.path}:${a.startLine}-${a.endLine}`).join(", ")

export const promptFor = (b: Block, question: string, quote: string, earlier: ReadonlyArray<{ readonly q: string; readonly a: string }> = []) =>
  `You are helping a reader understand code. Answer in at most 4 sentences.\n\n` +
  `Block: ${b.title}\nAnchors (at the pinned revision): ${anchorText(b) || "none"}\n` +
  `Story note: ${b.summary}\n` +
  (b._tag === "CodeRef" ? `\nCode:\n${b.code}\n` : "") +
  (b._tag === "Diff" ? `\nWhy it is read here: ${b.reason}\nChange:\n${b.hunks.map((h) => `${h.path}\n${h.patch}`).join("\n\n")}\n` : "") +
  (quote === "" ? "" : `\nThe reader pointed at this passage: "${quote}"\n`) +
  (earlier.length === 0 ? "" : `\nEarlier in this conversation:\n${earlier.map((t) => `Reader: ${t.q}\nYou: ${t.a}`).join("\n")}\n`) +
  `\nQuestion: ${question}`

export const reasonFor = (e: AskFailed) =>
  Match.value(e.code).pipe(
    Match.when("not_granted", () => "Claude access was declined for this page."),
    Match.when("rate_limited", () => "Too many questions in a short time."),
    Match.when("unavailable", () => "Claude is not reachable from this page."),
    Match.orElse(() => e.message),
  )

/** Added and removed lines of a Diff block, or undefined for other kinds. */
export const diffCounts = (b: Block): { readonly add: number; readonly del: number } | undefined => {
  if (b._tag !== "Diff") return undefined
  let add = 0
  let del = 0
  for (const h of b.hunks) {
    for (const line of h.patch.split("\n")) {
      if (line.startsWith("+")) add++
      else if (line.startsWith("-")) del++
    }
  }
  return { add, del }
}

/** What git prints after the line ranges of a hunk header: usually the enclosing function. */
const context = (header: string) => header.replace(/^@@.*?@@ ?/, "")

const Num = ({ n, width }: { n: number | undefined; width: number }) => (
  <span class="no" style={`width:${width}ch`}>{n ?? ""}</span>
)

/** One hunk of a diff: the file it changes, then its lines with their numbers before and after. */
const HunkPanel = ({ path, patch }: { path: string; patch: string }) => {
  const lines = hunkLines(patch)
  const adds = lines.filter((l) => l.kind === "add").length
  const dels = lines.filter((l) => l.kind === "del").length
  const width = Math.max(2, ...lines.map((l) => String(Math.max("old" in l ? l.old : 0, "new" in l ? l.new : 0)).length))
  return (
    <figure class="panel">
      <figcaption class="panel-head">
        <span class="path">{path}</span>
        <span class="counts">{adds > 0 && <span class="add">+{adds}</span>}{dels > 0 && <span class="del">−{dels}</span>}</span>
      </figcaption>
      <pre><code>
        {lines.map((l, i) =>
          l.kind === "hdr" ? (context(l.text) === "" ? null : <span key={i} class="ln hdr">{context(l.text)}{"\n"}</span>)
          : l.kind === "note" ? <span key={i} class="ln hdr">{l.text}{"\n"}</span>
          : (
            <span key={i} class={`ln ${l.kind}`}>
              <Num n={"old" in l ? l.old : undefined} width={width} />
              <Num n={"new" in l ? l.new : undefined} width={width} />
              <span class="sign">{l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}</span>
              {l.text + "\n"}
            </span>
          ))}
      </code></pre>
    </figure>
  )
}

/** Code as it stands at the revision, numbered from the first anchored line. */
const CodePanel = ({ head, code, from }: { head: string; code: string; from: number }) => {
  const lines = code.replace(/\n$/, "").split("\n")
  const width = Math.max(2, String(from + lines.length - 1).length)
  return (
    <figure class="panel">
      <figcaption class="panel-head"><span class="path">{head}</span></figcaption>
      <pre><code>{lines.map((text, i) => <span key={i} class="ln"><Num n={from + i} width={width} /><span class="sign" />{text + "\n"}</span>)}</code></pre>
    </figure>
  )
}

export const Body = ({ b }: { b: Block }) =>
  Match.value(b).pipe(
    Match.tagsExhaustive({
      Summary: () => null,
      Concept: () => null,
      Flow: (f) => <ol class="steps">{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>,
      CodeRef: (c) => <CodePanel head={anchorText(c)} code={c.code} from={c.anchors[0].startLine} />,
      Diff: (d) => (
        <>
          <p class="reason">{d.reason}</p>
          {d.hunks.map((h) => <HunkPanel key={`${h.path}${h.patch}`} path={h.path} patch={h.patch} />)}
        </>
      ),
      Risk: () => null,
    }),
  )

// Where the anchor already sits in a panel head, repeating it adds nothing.
export const showsAnchorInPanel = (b: Block) => b._tag === "CodeRef" || b._tag === "Diff"
