import { useLayoutEffect, useRef, useState } from "preact/hooks"
import { diffCounts } from "./body.tsx"
import { Icon } from "./icons.tsx"
import { kindName, previewOf } from "./preview.ts"
import { route } from "./route.ts"
import { fitTo, panBy, zoomAt, type Viewport } from "./canvas-math.ts"
import { NODE_H, NODE_W, type Scene, type SceneNode } from "./scene.ts"

export interface CanvasProps {
  readonly scene: Scene
  readonly partsOf: (id: string) => number
  readonly onOpen: (id: string) => void
}

const Meta = ({ n, parts }: { n: SceneNode; parts: number }) => {
  const b = n.block
  const counts = diffCounts(b)
  const left =
    counts !== undefined ? <span><span class="add">+{counts.add}</span> <span class="del">−{counts.del}</span></span>
    : b._tag === "Risk" ? <span class={`severity ${b.severity}`}>{b.severity} risk</span>
    : b._tag === "Flow" ? <span>{b.steps.length} steps</span>
    : b._tag === "CodeRef" ? <span class="mono">{b.anchors[0].path}:{b.anchors[0].startLine}</span>
    : <span>{b.label}</span>
  return (
    <span class="node-meta">
      {left}
      {parts > 0 && <span class="parts-badge">{parts} {parts === 1 ? "part" : "parts"}<Icon name="chevronRight" size={16} /></span>}
    </span>
  )
}

const Preview = ({ n }: { n: SceneNode }) => {
  const v = previewOf(n.block)
  switch (v._tag) {
    case "None": return null
    case "Steps": return (
      <ol class="pv-steps">
        {v.items.map((t) => <li key={t}>{t}</li>)}
        {v.more > 0 && <li class="more">+{v.more} more</li>}
      </ol>
    )
    case "Code": return <pre class="pv-code">{v.lines.join("\n")}</pre>
    case "Changes": return (
      <pre class="pv-code">{v.lines.map((l, i) => <span key={i} class={l.sign === "+" ? "ln add" : "ln del"}>{l.sign + l.text + "\n"}</span>)}</pre>
    )
  }
}

export const Canvas = (p: CanvasProps) => {
  const box = useRef<HTMLDivElement>(null)
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, k: 1 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const fit = () => {
    const el = box.current
    if (el) setVp(fitTo({ width: p.scene.width, height: p.scene.height }, { width: el.clientWidth, height: el.clientHeight }, 64))
  }
  useLayoutEffect(fit, [p.scene.width, p.scene.height])
  const centre = () => ({ x: (box.current?.clientWidth ?? 0) / 2, y: (box.current?.clientHeight ?? 0) / 2 })

  return (
    <div ref={box} class={`canvas${dragging ? " dragging" : ""}`} style={`--k:${vp.k};--x:${vp.x}px;--y:${vp.y}px`}
      onPointerDown={(ev) => {
        if ((ev.target as HTMLElement).closest(".node, .controls")) return
        drag.current = { x: ev.clientX, y: ev.clientY }
        box.current?.setPointerCapture(ev.pointerId)
        setDragging(true)
      }}
      onPointerMove={(ev) => {
        const d = drag.current
        if (!d) return
        const dx = ev.clientX - d.x
        const dy = ev.clientY - d.y
        d.x = ev.clientX
        d.y = ev.clientY
        setVp((v) => panBy(v, dx, dy))
      }}
      onPointerUp={() => { drag.current = null; setDragging(false) }}
      onWheel={(ev) => {
        ev.preventDefault()
        const r = box.current!.getBoundingClientRect()
        setVp((v) => zoomAt(v, { x: ev.clientX - r.left, y: ev.clientY - r.top }, Math.exp(-ev.deltaY * 0.0015)))
      }}>
      <div class="world" style={`transform:translate(${vp.x}px,${vp.y}px) scale(${vp.k})`}>
        <svg class="edges" width={p.scene.width} height={p.scene.height} aria-hidden="true">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 1 L10 5 L0 9 z" class="arrow" />
            </marker>
          </defs>
          {p.scene.lines.map((l) => (
            <path key={`${l.from}-${l.to}`} d={route(l).d} class="edge" marker-end="url(#arrow)" />
          ))}
          {p.scene.lines.filter((l) => l.label !== undefined).map((l) => (
            <text key={`t-${l.from}-${l.to}`} class="edge-label" x={route(l).mid.x} y={route(l).mid.y + 4} text-anchor="middle">{l.label}</text>
          ))}
        </svg>
        {p.scene.labels.map((l) => <p key={l.text} class="lane" style={`left:${l.x}px;top:${l.y}px`}>{l.text}</p>)}
        {p.scene.nodes.map((n) => (
          <div key={n.block.id} class="node" role="button" tabIndex={0} data-kind={n.block._tag}
            style={`left:${n.x}px;top:${n.y}px;width:${NODE_W}px;height:${NODE_H}px`}
            onClick={() => p.onOpen(n.block.id)}
            onKeyDown={(ev) => { if (ev.key === "Enter") p.onOpen(n.block.id) }}>
            {n.step !== undefined && <span class="step">{n.step}</span>}
            <span class="node-kind">{kindName(n.block)}</span>
            <span class="node-title">{n.block.title}</span>
            <span class="node-summary">{n.block.summary}</span>
            <Preview n={n} />
            <Meta n={n} parts={p.partsOf(n.block.id)} />
          </div>
        ))}
      </div>
      <div class="controls" role="group" aria-label="View">
        <button type="button" aria-label="Zoom out" onClick={() => setVp((v) => zoomAt(v, centre(), 1 / 1.25))}><Icon name="remove" /></button>
        <span class="zoom">{Math.round(vp.k * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setVp((v) => zoomAt(v, centre(), 1.25))}><Icon name="add" /></button>
        <button type="button" class="fit" aria-label="Fit to screen" title="Fit to screen" onClick={fit}><Icon name="fitScreen" /></button>
      </div>
    </div>
  )
}
