# Principles: why the rules work

Rules in this skill are shortcuts. When a case is not covered, derive the answer from
these. Each principle ends with what it justifies.

Tags: **[established]** well supported and stable. **[contested]** real, but often
overapplied; state the limit when you use it.

## Starting point

A person's attention is scarce and arrives with a question ("where is X", "can I do Y",
"what happened?"). Every element on screen costs attention; it must earn it. Everything
below follows from that.

## Feedback and time

**Response-time limits [established].** About 0.1 s feels instantaneous. About 1 s keeps
a train of thought unbroken, with a visible hint that something is happening. Past about
10 s attention drifts, so show real progress and allow cancel (Nielsen, building on
earlier human-factors work).
Justifies: respond to a press within ~100 ms; any wait over ~1 s needs a spinner or
skeleton; long waits need a measurable bar.

**Gulf of execution and gulf of evaluation [established].** (Norman) Users must be able
to see what they can do, and then see what happened as a result.
Justifies: signifiers (affordances you can see), press/hover/focus states, confirmation
after an action, visible system status.

**Recoverability over confirmation [established].** A confirm dialog trains people to
click through. Undo makes the action safe without interrupting it.
Justifies: toast with Undo; confirm only for irreversible or costly actions.

## Perception

**Grouping (Gestalt) [established].** People group by proximity, similarity, common
region (a shared container) and alignment.
Justifies: spacing as hierarchy (close = related), consistent styling for same-role
things, cards/containers for scope, edge alignment.

**Lightness carries hierarchy [established].** Differences in lightness (and size/weight)
are read before hue. Squint or convert the screen to grayscale; if the hierarchy
disappears, color was doing a job lightness should do.
Justifies: contrast-based emphasis, text contrast checks, not relying on hue alone.

**Difference creates emphasis [established].** Something stands out only relative to its
surroundings. If everything is bold or colored, nothing is.
Justifies: default states recede (gray), the non-default gets the signal; one primary
action per view.

## Targets and choices

**Fitts's law [established].** Time to hit a target rises with distance and falls with
size. Practical floors: ~44 pt (Apple) or 48 dp (Material) touch targets; WCAG 2.2 sets a
24 x 24 CSS px minimum (AA) and 44 x 44 (AAA). Edges and corners of the screen are easy to
hit.
Justifies: generous tap areas (pad the hit area, not just the visual), bottom-reachable
primary actions on phones, spacing between adjacent targets.

**Hick-Hyman law [contested].** Decision time grows with the number of equally likely
options. It does not mean "fewer options always wins": categorized, scannable, familiar
options can be fast, and removing needed options moves the cost elsewhere.
Justifies: group and order choices, show the likely ones first, reveal the rest on
demand. Do not use it to justify hiding things people need.

**Convention (Jakob's law) [contested].** People spend most of their time in other
products and expect yours to work alike. Break a convention only for a gain users will
notice.
Justifies: standard icons, familiar placements (cart, search, back), unsurprising
controls.

**Aesthetic-usability effect [contested].** Polished interfaces are judged easier to use,
and users forgive more. It supports caring about craft, but it can also mask real
usability problems; do not use it to skip testing.

## Text and numbers

**Readability [established, with ranges].** About 45–75 characters per line for running
text; body line-height roughly 1.4–1.6; WCAG requires layouts to survive text spacing
overrides. Numbers that must align (prices, tables, timers) need tabular figures
(`font-variant-numeric: tabular-nums`).
Justifies: max-width on prose, line-height tokens, aligned numeric columns.

## Motion

**Motion should explain, not decorate [established].** Good motion shows where something
came from and went (spatial continuity) and what caused what (causality). Entering
elements decelerate (ease-out), leaving ones accelerate (ease-in), and duration grows
with distance traveled.
Justifies: slide from the trigger, short exits, no travel on trivial changes, no linear
easing on UI motion.

**Motion cost [established].** Motion draws the eye and can trigger discomfort. It must be
earned and must honor the user's reduced-motion setting.

## Access and constraints

**Accessibility constraints [established].** Color is never the only carrier of meaning
(WCAG 1.4.1); focus must be visible and ordered (2.4.7); text contrast 4.5:1, large text
and UI components 3:1 (1.4.3, 1.4.11); respect `prefers-reduced-motion`.

**Constraints reduce decisions [established practice].** A small token set (spacing,
type, color, radius, motion) makes a product coherent and makes each choice cheap. Add a
token rather than a one-off value.

## Using these

When a rule and a principle disagree, follow the principle and note the exception. When
you cannot name the principle behind a design choice, treat the choice as decoration and
reconsider it.
