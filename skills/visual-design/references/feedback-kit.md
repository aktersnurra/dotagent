# Feedback kit: make UI feel alive

A UI feels dead when actions get no response, state changes snap, and content just
appears. This file is the default fix. Apply all of it unless there is a reason not to.
Everything here is **[practice]** unless tagged **[video]**; values are starting points
to tune by feel.

## The rule

Every user action gets a visible response within ~100 ms. Every state change animates.
Every async action shows progress. Motion priority, loudest to quietest:
press feedback > state change > entrance > ambient. Do not animate ambient things
before the first three are done.

## Tokens (put on `:root`)

```css
:root {
  --dur-press: 90ms;   /* press down/up */
  --dur-fast: 150ms;   /* hover, color, small state */
  --dur-base: 240ms;   /* panels, toggles, reveal */
  --dur-slow: 420ms;   /* hero, page-level */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);        /* default: fast start, soft landing */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* slight overshoot: toggles, pops */
}
```

Animate `transform` and `opacity` (cheap, smooth). Avoid animating width/height/top/left
and large box-shadows on many elements.

## Buttons and clickable things

```css
.btn {
  transition: transform var(--dur-press) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out);
}
.btn:hover  { transform: translateY(-1px); background-color: var(--primary-hover); }
.btn:active { transform: translateY(0) scale(0.97); transition-duration: 60ms; }
.btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.btn[disabled] { opacity: .5; cursor: not-allowed; transform: none; }
```

- Press = scale 0.96–0.98 [video: "feel good" needs hands-on tuning]. Release springs back.
- Hover only on devices that hover: wrap in `@media (hover: hover)`.
- Clickable cards: lift 2px + stronger shadow on hover; non-clickable cards do nothing.
- Links: animated underline (`background-size` 0→100%) or color fade, not an instant snap.

## Async actions (never leave a click silent)

1. On click: button immediately enters a loading state (swap label for spinner, keep
   its width so layout doesn't jump, ignore further clicks).
2. On success: confirm (check mark pop, "Added" for ~1.5 s, toast or chip sliding up
   [video]), then settle back.
3. On failure: shake or red state + message with a recovery action.
4. Prefer optimistic updates for cheap actions (toggle, like, add to cart), rolling back
   on failure.

```css
@keyframes pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
.check { animation: pop var(--dur-base) var(--ease-spring) both; }
@keyframes spin { to { transform: rotate(360deg) } }
.spinner { animation: spin .7s linear infinite; }  /* linear is right for spinners */
```

## Entrances and reveals

Content should arrive, not appear. Small rise + fade, staggered:

```css
@keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.reveal { animation: rise var(--dur-base) var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms); }
```

Set `style="--i:0..n"` on siblings; cap the stagger (~6 items). For scroll reveals use
`animation-timeline: view()` where supported, else `IntersectionObserver` adding a class.
Use `@starting-style` for elements entering the DOM (menus, toasts, dialogs).

## State changes

- Toggle/switch: thumb moves with `--ease-spring`; track color fades.
- Tabs/segmented control: sliding indicator (transform), not a swap.
- Expand/collapse: animate with `grid-template-rows: 0fr → 1fr` or the Web Animations API,
  not a jump.
- List add/remove/reorder: fade + slide on add/remove; layout transition on reorder
  (FLIP or View Transitions) [video: reordering is a cheap way to feel premium].
- Route/page changes: View Transitions API
  (`document.startViewTransition`) with a short cross-fade; shared elements get
  `view-transition-name`.
- Inputs: focus ring and label animate; error state fades in with its message.

## Loading and waiting

- Skeletons with a slow shimmer (1.4 s) for content; spinner only for short actions.
- Progress you can measure: show a bar. Progress you can't: say what is happening.
- Never leave a blank gap while data loads.

## Toasts, dialogs, menus

Enter with fade + 8px translate (`--dur-base`), exit faster (`--dur-fast`). Menus scale
from their origin (`transform-origin` at the trigger), 0.96 → 1.

## Reduced motion (required)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

Keep the opacity/color feedback; drop transform and travel.

## Frameworks

- **Phoenix LiveView**: use the `phx-click-loading` / `phx-submit-loading` classes for
  instant pending states, and `JS.transition` / `JS.show` with transition args for
  enter/leave. Verify against the installed LiveView version.
- **Bonsai/Vdom**: drive state with CSS classes and give list items stable keys so
  enter/leave and reorder can animate; keep animation in CSS where possible.
- Any framework: put motion in CSS with the tokens above; JS only toggles classes.

## Verify (don't skip)

Screenshots cannot show motion. Open the page in a real browser and: press every button
(does it respond within a blink?), hover every card and link, tab through with the
keyboard, trigger every async action, resize and check at max text size. If you cannot
do this, say the motion is untested.

## Anti-patterns

- Linear easing on UI motion; durations over ~400 ms for routine interactions.
- Everything bouncing; hover effects on non-interactive elements.
- Motion that blocks input or delays the result it decorates.
- Animating layout properties on long lists.
- Feedback only on hover (touch users never see it); always include `:active`.
