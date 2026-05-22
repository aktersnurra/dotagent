---
name: ui-design
description: First-principles reasoning for designing app UIs that avoid the dashboard/crudy vibe. Use when designing or reviewing any screen, component, or layout — especially for tools (apps used to do something, not consumed passively). Covers hierarchy, structure-matches-logic, when to use cards/lists/charts, what belongs on which screen, and the difference between status surfaces and action surfaces.
---

# UI design

A working framework for designing app interfaces that feel like designed
tools rather than database admin panels or feature checklists.

This is opinionated. It privileges clarity over completeness, action
over status, and honest information design over decorative chrome.

## The core principle

**Every screen has one job. Design the screen so that one job is
the obvious, dominant thing.**

If a user can't tell within two seconds what the screen is for, the
screen is failing. If a user can identify the primary task but can't
execute it without first parsing five secondary elements, the screen
is still failing.

The crudy vibe almost always comes from violating this: too many
peers competing for attention, no clear headline, no obvious next
action.

## The five questions to ask before designing anything

Before designing any screen, component, or layout, answer these:

1. **What's the user's intent on this surface?** Past tense
   (reflection), present tense (do something now), or future tense
   (plan something)? Different tenses require different designs.

2. **What's the single most important piece of information or action?**
   If you can't pick one, you don't understand the screen yet.

3. **What's the unit of repetition?** Cards, rows, list items, grid
   cells? Pick one and commit. Mixing unit types within one screen
   creates visual chaos.

4. **What's the scope of each container?** A card represents one
   concept. A section represents one category of concepts. A screen
   represents one user intent. Containers shouldn't violate their
   scope (e.g. don't put long-term identity info inside a
   "this week" card).

5. **What state is this in?** Empty, loading, partial, full, error,
   success. Every screen has these states. Design them all, or the
   empty state will look like a bug.

## Tense determines structure

The single most useful distinction in app design:

**Past tense surfaces (Stats, history, archives):**
- Goal: help the user understand what happened.
- Pattern: dense information, charts, lists, comparisons.
- Density is fine; the user came here to read.
- Empty state is meaningful — "no history yet" is honest.

**Present tense surfaces (Home, current session, active task):**
- Goal: help the user do something *now*.
- Pattern: one dominant action, minimal context.
- Density is wrong — every element competes with the action.
- Empty state should still offer the primary action.

**Future tense surfaces (planners, wizards, schedulers):**
- Goal: help the user declare intent and see the result.
- Pattern: input section + output section, clear separation.
- Density depends on whether the user is configuring or reviewing.
- Empty state on the output side is "waiting for input."

When a surface mixes tenses, you usually want to split it. A "Home"
screen that's actually 70% historical dashboard is two screens
masquerading as one.

## Information hierarchy: the three-level rule

Pick exactly three levels of visual weight on any screen:

1. **Primary**: the headline. The thing the user came for. One per
   screen. Big, high-contrast, dominant.
2. **Secondary**: supporting context. Multiple per screen, all at
   the same weight. Medium contrast, smaller.
3. **Tertiary**: metadata, labels, helper text. Many per screen.
   Low contrast, small.

Two levels feels flat. Four levels reads as inconsistent. Three is
the sweet spot.

When you find yourself adding a fourth level, you've probably tried
to put too much on the screen. Cut something instead of adding a
level.

**Test:** squint at the screen. You should see the primary element
clearly, the secondary elements as a group, and the tertiary elements
as a faint texture. If everything reads as roughly equal weight,
the hierarchy is broken.

## The "structure matches logic" principle

Visual structure should reflect logical structure. If two things
have the same conceptual role, they should look the same. If two
things have different roles, they should look different.

Common violations:

- *Goals and metrics shown at the same visual weight* when goals
  are inputs and metrics are outputs.
- *Solver parameters mixed with user goals in a form* when they're
  conceptually different categories of input.
- *Long-term state (user level) inside short-term containers
  (this-week card)*, which violates the container's scope.
- *Two different things rendered as identical card shapes* when
  one is a creation action and the other is a destination.

The fix is always: identify the categories, then design distinct
visual treatments per category, then group by category.

## Cards: when and why

Cards are useful when:
- They represent **discrete concepts** that benefit from clear
  boundaries (one workout, one goal, one session).
- They contain **internal structure** that needs visual containment.
- Multiple cards on a screen represent **peer concepts at the
  same logical level**.

Cards are harmful when:
- They wrap **a single piece of text or one number** — that's
  just decoration around content.
- They **fragment a continuous concept** (e.g. a status strip that
  should be one line, broken into three separate cards).
- They're used as a **visual filler** to make the screen look
  "designed" without serving the content.

**Test:** if you removed the card chrome, would the content lose
meaning? If no, the card isn't doing work. If yes, the card is
correctly scoped.

Per-card padding should be generous (24–32px internal). Cramped
cards read as data tables.

## Lists: when and why

Lists (rows, not cards) are right when:
- Many items share **identical structure** and the user is scanning.
- The user needs to **compare across items** (eye runs vertically
  down a column).
- Per-item actions are rare or hidden — the row is for reading,
  not interacting.

For list rows, **single line beats two lines** when the content
fits. Single-line rows let the user see 2× as many items in the
same vertical space, and scanning is no harder if the columnar
structure is clean.

Tabular figures matter on any numeric column. Without them, digits
of different widths cause the column to wobble visually.

Drop per-row chevrons unless the destination is non-obvious. A
tappable row doesn't need a chevron to communicate tappability.

## What belongs together: container scope

A container (card, section, screen) has a logical scope. Everything
inside it should fit that scope.

**This is the most common source of crudy vibe.** Mixing scopes
within a container is what makes screens feel cluttered even when
they're not visually busy.

Examples of scope violations:

- "This week" card containing the user's all-time level
  (week-scope contains identity-scope).
- "Goal progress" card containing edit-goal actions
  (read-scope contains write-scope; move actions to detail view).
- "Home" screen containing 12 weeks of history grid
  (present-scope contains past-scope).
- "Validation" panel showing solver output framed as input check
  (input-scope and output-scope conflated).

To fix: identify the scope of each container explicitly, then move
out-of-scope content to a container that does match.

## Action vs. status surfaces

Two failure modes pull apps toward the crudy vibe:

**Action surfaces that became status displays.** Home screens that
turned into dashboards. The user came to do something, but the
screen is showing them data instead.

**Status surfaces that don't surface status clearly.** Stats screens
that bury the most important number in the middle of the page,
surrounded by secondary charts.

The fix in both cases is to identify which type the screen is and
design accordingly:

- Action screens: 1 primary action, minimal status, generous empty
  space. The screen should *not* fill the viewport.
- Status screens: 1 headline metric, supporting charts/lists below,
  density appropriate to a "reading" surface.

When designing a new screen, write down the answer to "is this
action or status?" before sketching anything. The answer determines
80% of the layout decisions that follow.

## Navigation: tabs vs. actions

Tabs are for **destinations** — places the user navigates to find
things. They should hold things of the same shape (lists, summaries).

Actions are for **creation, editing, or invocation** — things the
user does. They belong in buttons, FABs, overflow menus, or
disclosure controls. They do *not* belong in tabs.

Test: would the user ever sit on this tab and read? If yes, tab.
If the tab exists only to launch a form or trigger an action, it's
not a tab — it's a button hiding in a tab bar.

A tab bar should have 3–5 items. More than 5 and labels disappear,
icons become ambiguous, and the user has to memorize the layout.
If you have 7 items, you have hidden categories — find them and
collapse.

## Charts: the trend-vs-composition question

Before choosing a chart type, answer: is the user trying to see
**trends within categories** or **composition of a total**?

- **Trend within category** → lines, one per category, shared
  or independent axis.
- **Composition of total** → stacked bars or pie.
- **Comparison of single values** → grouped bars.

Stacked bars mixed with trend intent is the most common chart
mistake — the orange segments shift vertically based on the blue
segments, so neither trend is independently legible.

When category magnitudes differ enough that a shared axis crushes
the smaller series:

- **<2.5x ratio**: shared axis is fine.
- **2.5–5x ratio**: shared axis with per-series reference lines
  (ceilings, targets) — gives meaning to the asymmetry.
- **>5x ratio**: small multiples (one chart per series, side by
  side) — preserves trend visibility per category.

Never use dual y-axes. They mislead by allowing arbitrary visual
correlation between unrelated scales.

Every chart needs: axis labels (at least 2–3 values per axis),
inline series labels (not separate legends), and clear units in
the subtitle.

## Forms: declarative vs. tuning vs. constraint inputs

When a form has more than ~5 inputs, classify each one:

1. **Declarative** — what the user wants. Their goal. Always visible,
   prominent.
2. **Constraint** — hard limits the system must respect. Visible
   but secondary.
3. **Tuning** — hints that shape system behavior without defining
   the problem. Hidden behind disclosure or deferred to post-output
   tuning.

Visual hierarchy should match this classification. When a form
exposes all inputs at equal weight, it looks like a database
admin panel because that's structurally what it is — a flat view
of fields.

For forms that drive a solver, recommender, or generator: split
into **input** and **output** sections, ideally as two cards. The
output card shows the system's response to the inputs. This
preserves the declarative → result mental model and avoids
mixing intent with result.

## Empty states are part of the design

Every screen has an empty state. New users hit it first. Power
users hit it when they delete their data or filter to nothing.

A well-designed empty state:
- Explains why the surface is empty.
- Offers the most likely next action.
- Doesn't look like a bug.

Common empty state failures:
- A 12-cell grid mostly showing "—" (looks broken, communicates
  "you've failed").
- A blank panel with no text (looks broken).
- Generic copy like "No data" (uninformative).

Design the empty state with the same care as the populated state.
For new-user empty states specifically, make sure the screen doesn't
read as "look at all this nothing." Frame the empty state as
potential, not absence.

## Specific anti-patterns to avoid

These are the recurring sources of crudy vibe. If you find any of
these in your own design, stop and fix:

1. **Multiple primary CTAs.** "Start workout" and "Log session" at
   equal visual weight on the same screen. Pick one as primary.

2. **Notification-badge styling for non-notification content.**
   Small colored circles with a number mean "count of unread
   things." Don't use them for status labels.

3. **Native number steppers (`<input type=number>`).** Tiny up/down
   arrows look like an unstyled form. Strip them or replace with
   custom controls.

4. **Bright validation borders on healthy states.** Green outline
   around a panel reads as "alert." Use ✓/✗ icons and let the
   background stay neutral.

5. **Per-cell borders on grids that should be one element.** A
   12-cell week grid where each cell has its own border reads as
   a database table. Use whitespace and hairlines instead.

6. **Charts without axis labels.** Every chart needs context. A
   bare line with no values is decoration.

7. **Stacked bars when the user wants trends.** Picks the wrong
   chart for the question.

8. **Labels and values at the same visual weight.** "Streak: 2 wks"
   where both words are the same size means the user has to read
   both to find the data. Make the value pop.

9. **Cancel buttons as prominent as Save buttons.** Cancel is an
   escape, not an action. Demote to a text link.

10. **Destructive actions visible by default.** "Remove" buttons
    next to "Copy" buttons at equal weight invite accidents. Put
    destructive actions in overflow menus.

## The squint test, the room test, the 2-second test

Three tests for any screen:

**Squint test:** squint at the screen until details blur. You
should still see the primary element clearly. If everything blurs
to the same mass, hierarchy is broken.

**Room test:** put the device 6 feet away. Can you still read the
headline of the screen? For tools used during physical activity
(timers, workout apps, kitchen apps), this is the bar.

**2-second test:** show the screen to a user for 2 seconds, then
hide it. Can they describe what the screen is for? If not, the
screen lacks a clear primary intent.

## When in doubt, subtract

The single most common fix for a crudy screen is **removing
something**. Most screens have at least one element that's there
"just in case" or because the engineer wanted to expose a feature.

Before adding anything to a screen, ask: what could I remove to
make room for this?

Before shipping a screen, ask: which one element, if removed,
would make this screen better?

Restraint is a designed property, not an absence of work.

## Process for designing a new screen

When designing a new screen from scratch:

1. **Write the user intent in one sentence.** "The user wants to
   start a workout fast." If you can't, you don't understand the
   screen.

2. **Classify the screen** as action, status, or wizard (input →
   output).

3. **Identify the primary element** — the one thing that should
   dominate. Big, central, high-contrast.

4. **List secondary elements** — supporting context. All at the
   same visual weight, smaller than primary.

5. **List tertiary elements** — labels, metadata. Quiet,
   present but not loud.

6. **Sketch container scope** — what goes in which card/section.
   Verify no scope violations.

7. **Design the empty state explicitly.** What does this look like
   when the user has no data?

8. **Apply the three tests** (squint, room, 2-second).

9. **Subtract one element.** What's the least important thing? Can
   it be removed or moved to a detail view?

This process catches most crudy-vibe issues before they ship.

## Process for reviewing an existing screen

When reviewing a screen that feels off but you can't articulate why:

1. **Apply the squint test.** Is there a clear primary element?
   If not, fix the hierarchy first.

2. **Check container scopes.** Is anything inside a container
   that doesn't match the container's logical scope?

3. **Check tense.** Is a present-tense surface trying to be a
   dashboard? Is a past-tense surface burying the headline?

4. **Count CTAs.** Are there multiple primary actions competing?
   Pick one.

5. **Count visual levels.** More than three? Collapse to three.

6. **Look at the empty state.** Does it look like a bug? Does it
   discourage rather than offer a next step?

7. **Find the anti-patterns** from the list above.

8. **Identify the one element that, if removed, would help most.**
   Cut it.

Most "crudy" screens get to "clean" in 3–5 specific changes, not
a full redesign.

## What this skill is not

This is a working framework, not a style guide. It doesn't tell
you which colors to use, which font, which radius for card corners.
Those are project-level decisions that should be consistent across
the app but aren't universal principles.

It also doesn't replace seeing well-designed examples. The
references worth studying for tools (not consumer apps):

- Linear (web and mobile) for dense-but-clean.
- Apple Fitness for action-first single-screen design.
- Vercel dashboard for status surfaces.
- Stripe dashboard for forms that drive systems.

These are reference points for *how the principles look applied*,
not templates to copy.

## Summary heuristics

A short list to keep nearby:

- Every screen has one job.
- Tense determines structure.
- Pick three visual levels.
- Visual structure should mirror logical structure.
- Cards represent concepts; lists represent repetition.
- Containers have scope; respect it.
- Action surfaces don't fill the viewport.
- Status surfaces lead with the headline.
- Tabs are destinations; actions are buttons.
- Empty states are part of the design.
- When in doubt, subtract.
