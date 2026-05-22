---
name: ui-design-checklist
description: Fast checklist for designing or reviewing UI screens. Use as a quick reference when sketching a new screen or diagnosing why an existing screen feels off. Companion to the ui-design skill; this file is the actionable subset, not the reasoning. Reach for this when you want a 30-second pass over a design rather than a full framework walkthrough.
---

# UI design checklist

Fast reference. For the underlying reasoning, see `ui-design.md`.

## Designing a new screen

1. **One sentence: what does the user want here?**
   If you can't write it, stop. You don't understand the screen yet.

2. **Tense:** action (do now), status (read what happened), or
   wizard (declare intent → see result)?

3. **One primary element.** Pick it. Big, central, dominant.

4. **Three visual levels, no more.** Primary, secondary, tertiary.

5. **Container scope.** Each card/section/screen has one logical
   scope. Nothing inside it should violate that scope.

6. **Empty state.** Design it explicitly. Don't let it look like
   a bug.

7. **Three tests:**
   - *Squint:* primary still visible?
   - *Room:* readable from 6 feet?
   - *2-second:* user can describe the purpose after a glance?

8. **Subtract one thing.** What's the least important element?
   Can it be removed or moved to a detail view?

## Reviewing an existing screen

When something feels off but you can't say why, walk this list:

1. **Squint test.** Is one element clearly dominant?

2. **Container scope.** Anything inside a card/section that
   doesn't match that container's logical scope?

3. **Tense check.** Is a present-tense surface trying to be a
   dashboard? Is a past-tense surface burying the headline?

4. **Count CTAs.** More than one primary action? Pick one.

5. **Count visual levels.** More than three? Collapse to three.

6. **Empty state check.** Does it look like a bug? Does it
   discourage rather than offer a next step?

7. **Anti-pattern scan.** Check the list below.

8. **Subtract.** Which one element, if removed, would help most?

## Anti-pattern scan

Quick check for the recurring crudy-vibe sources:

- [ ] Multiple primary CTAs at equal visual weight.
- [ ] Notification-badge styling on non-notification content.
- [ ] Native `<input type=number>` steppers visible.
- [ ] Validation borders bright enough to read as alerts.
- [ ] Per-cell borders on grids that should be one element.
- [ ] Charts without axis labels or unit context.
- [ ] Stacked bars where the user wants per-category trends.
- [ ] Labels and values at the same visual weight.
- [ ] Cancel button as prominent as Save.
- [ ] Destructive actions visible by default (not behind ⋯).
- [ ] Status info inside an action surface (or vice versa).
- [ ] Long-term state inside a short-term container.
- [ ] Empty states framed as absence rather than potential.

## Chart-type decision

What is the user trying to see?

- **Trend within categories** → lines, one per category.
- **Composition of a total** → stacked bars.
- **Comparison of single values** → grouped bars.
- **Distribution** → histogram.

When category magnitudes differ:

- **<2.5×** → shared axis, fine.
- **2.5–5×** → shared axis with per-series reference lines.
- **>5×** → small multiples.

Never dual y-axes.

Every chart needs: axis labels (2–3 values minimum), inline
series labels (not separate legends), units in the subtitle.

## Cards vs. lists vs. plain layout

- **Card** when the item is a discrete concept with internal
  structure, and multiple cards on screen are peers.
- **List row** when many items share identical structure and
  the user scans across them.
- **Plain layout (no chrome)** when the content is one or two
  pieces of text — don't wrap single facts in cards.

If you'd lose meaning by removing the card chrome, the card is
correctly scoped. If you wouldn't, drop the card.

## Form input categories

When a form has >5 inputs, classify each:

- **Declarative** (what the user wants) → always visible, prominent.
- **Constraint** (hard limits) → visible, secondary weight.
- **Tuning hint** (system behavior preferences) → behind disclosure
  or in a post-output tuning panel.

Forms driving solvers/recommenders: split into input card and
output card.

## Navigation

- **Tabs** = destinations (places to navigate to).
- **Buttons/FABs** = actions (things to do).
- **3–5 tabs**, all labeled. Above 5: hidden categories — find
  and collapse.
- Active state must be unambiguous: filled icon + label in accent
  color minimum.

If a tab exists only to launch a form, it's not a tab.

## List row defaults

- Single line when content fits.
- Tabular figures on any numeric column.
- Right-aligned numerics, left-aligned text.
- Drop per-row chevrons unless destination is non-obvious.
- Whole row tappable; don't hide that behind small targets.
- Hairline dividers between rows, not per-row borders.

## Card defaults

- Internal padding 24–32px.
- Title at top, content below, actions at bottom (if any).
- One concept per card.
- Tappable cards lead to detail views; secondary actions live
  in the detail view, not on the summary card.
- Hairline border or subtle background fill — not both.

## Status surface defaults

- Headline metric in the dominant visual position.
- Charts and lists below, density appropriate to "reading."
- Empty state explains and offers next action.
- Refresh/update mechanism if data is live.

## Action surface defaults

- One primary action, visually dominant.
- Minimal status, just enough context to confirm "right place."
- Empty space is fine — screen does not need to fill viewport.
- Secondary actions present but quiet (links, not buttons).

## Wizard surface defaults

- Two cards: inputs (declarative + constraints) and output
  (result + tuning).
- Output card has an empty state until inputs are valid.
- Output updates live (debounced) or on explicit "Generate" —
  decide based on solver/compute speed.
- Save action lives outside both cards; it commits the combination.

## Pre-ship checklist

Before shipping any new screen:

- [ ] Can a user describe the screen's purpose in 2 seconds?
- [ ] Is the primary element clearly dominant?
- [ ] Three visual levels, no more?
- [ ] Empty state designed and tested?
- [ ] All container scopes clean?
- [ ] No anti-patterns from the scan list above?
- [ ] Subtracted at least one element from the first draft?
- [ ] Three tests pass (squint, room, 2-second)?

If any answer is "no" or "I don't know," go back and fix that
before shipping.
