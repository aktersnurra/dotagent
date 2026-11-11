---
name: visual-design
description: Visual craft for UI — spacing and grids, typography, color schemes and palettes, shadows, dark mode, icons and buttons, interaction states, motion, and imagery (art direction, AI image generation, text over images). Use when building, polishing, or reviewing the look and feel of an interface, when choosing or generating a color palette, or when sourcing and directing images. Complements `ui-design`, which owns screen structure, hierarchy, and copy.
---

# Visual design

Make an interface look and feel considered. This skill owns the **surface**: spacing,
type, color, depth, states, motion, imagery. `ui-design` owns **what the screen is for**:
structure, hierarchy, containers, copy. Decide structure first, then apply this.

Rules are tagged by provenance so you know how hard to lean on them:

- **[video]** — a heuristic from design talks this skill was built from. Useful defaults,
  not standards. Break them with a reason.
- **[practice]** — established practice (WCAG, OKLCH, common design-system conventions).

## Core idea

Quality comes from **contrast and consistency**, not decoration. Hierarchy is the
_difference_ between an element and its neighbors [video]. Consistency (one font, one
spacing scale, one corner radius, one icon style) is what makes a product feel like one
product. When a screen looks off, look for an inconsistency or a missing difference
before adding anything.

## Workflow

1. **Pick references first.** Find 2–3 apps that look like what you want. Name what you
   are borrowing (layout, density, color mood). Do not start from a blank page.
2. **Set the system once**: spacing scale, type scale, one primary color + ramp,
   radius, icon size. Write it down as tokens (CSS variables or equivalent).
3. **Build with tokens only.** No one-off values.
4. **Do the feedback pass.** UI that does not respond feels dead. Apply
   `references/feedback-kit.md` by default: press/hover/focus on everything clickable,
   loading and confirmation on every async action, animated state changes, entrances,
   reduced-motion support. Then cover every state (default, hover, pressed, disabled,
   focus, error, loading, empty); see `references/states-and-motion.md`.
5. **Verify live, not just by screenshot.** Screenshots cannot show motion. Open it in a
   browser, press, hover, tab, trigger async actions, check max text size and dark mode.
   Agents miss clipping, overlap, and "feels wrong". If you could not test motion, say so.

## The short rules

**Spacing** [video]: use a 4-point scale (multiples of 4; halves cleanly). White space
beats more grid. Group related items closely and separate groups widely; that grouping is
itself hierarchy. Grids are guidelines, not law.

**Type** [video]: one sans-serif family is enough. Large headings: letter-spacing about
-2% to -3%, line-height about 110–120%. Landing pages: at most six sizes. Dashboards:
rarely above 24px. Body text: generous line-height, slightly lower contrast than headings.

**Color** [video + practice]: start from one primary; derive a ramp (light tints for
backgrounds, dark shades for text). Use color for _meaning_ (success, warning, danger,
info), not decoration. Check contrast numerically. Full method in `references/color.md`.

**Depth** [video]: shadows are usually too strong. Lower opacity, raise blur; cards get
less, popovers more. If you notice the shadow first, it is wrong.

**Icons and buttons** [video]: icon size equals the text line-height (e.g. 24px).
Sidebar links are ghost buttons. Horizontal padding about twice vertical. One icon style
per product (all outlined or all filled, one stroke weight).

**Dark mode** [video]: lower border contrast; no shadows, use lighter surfaces for
depth; desaturate bright chips; backgrounds can be tinted, not only gray.

**Feedback and motion** [video + practice]: defaults and copy-paste CSS are in
`references/feedback-kit.md`. Name the technique (keyframes, spring, layout transition, gesture,
particles), never "add animation". Eased or spring motion, never linear. One hero moment,
not motion everywhere. See `references/states-and-motion.md`.

**Imagery** [video + practice]: images carry meaning and scanning speed; use them where
they identify or create appetite, and give them real space. Direct image generation with
references and a named art style. Text over images needs a gradient, not a flat overlay.
See `references/imagery.md`.

## References

- `references/color.md` — building a palette, ramps, semantic colors, contrast, dark mode.
- `references/feedback-kit.md` — default motion/feedback tokens and CSS; read this first for any interactive UI.
- `references/principles.md` — why the rules work (response time, gestalt, Fitts, readability, motion); use when a case is not covered.
- `references/scannability-and-decisions.md` — edges, differentiation, and filters/pickers that show consequences.
- `references/states-and-motion.md` — state matrix, feedback, motion techniques, QA edge cases.
- `references/imagery.md` — art direction, AI image prompts, text on images, sizing.

## Pre-ship check

- Every value comes from a token; one font, one radius, one icon style.
- Text meets contrast (4.5:1 body, 3:1 large/UI); verified, not eyeballed.
- Every interactive element has hover, pressed, disabled, and focus states, and presses
  respond within ~100 ms.
- Every async action shows loading, then confirmation or failure.
- Looks right at max system text size and in dark mode; nothing clips or overlaps.
- Shadows and borders are quiet; color means something.
- Images are the right size for their slot and text over them is readable.
- Motion has a purpose and returns to a rest state.
