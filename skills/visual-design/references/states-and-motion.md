# States, feedback, and motion

Provenance tags: **[video]** heuristic from design talks, **[practice]** established
practice.

## State matrix

[video] "When a user does anything, there should be a response."

| Element | Required states |
| --- | --- |
| Button | default, hover, pressed/active, disabled; loading when async |
| Input | default, focus, filled, error (border + message), disabled; warning when useful |
| Nav item / list row | default, hover, selected/active |
| Container | selected (a container around one item signals selection); gray text signals inactive |
| Async region | loading (spinner or skeleton), success confirmation, failure with recovery |

Also keyboard focus must be visible [practice]. For empty, loading, and error _copy and
structure_, use `ui-design`.

## Signifiers

Show how things work through the UI itself so no instructions are needed [video]:
containers, highlights on the active item, hover and press states, tooltips. For
icon-only toolbars tooltips are the accepted exception; elsewhere prefer recognizable
visuals over adding labels and tooltips everywhere.

## Micro-interactions

Feedback one notch above the obvious [video]: a copy button that only changes on hover
does not confirm copying; a small chip sliding up does. Range from practical to playful,
but practical first.

## Motion: pick a named technique

[video] Telling an agent to "make animations" gives poor results. Specify:

| Need | Technique |
| --- | --- |
| Choreographed A→B sequence | Keyframes (three is often enough) |
| Press, toggle, element entrance | Spring or ease-in/ease-out; never linear |
| Direct manipulation | Gesture-driven: follow the finger, then overshoot and settle |
| World that feels physical | Physics simulation |
| Element follows a path / shape morph | SVG path, path morph |
| List reorder, list to grid | Layout transition (cheap way to feel premium) |
| Celebration | Particles / sprite |
| Complex character | Rive/Lottie state machine |

Techniques compose; a good moment often uses several.

Rules:

- **Rest state.** Every animation has a resting state and returns to it, giving a clean
  start and end [video].
- **One hero moment** (first landing, completion) rather than motion everywhere. The
  rest stays quiet.
- Tuning: a press that feels wrong usually needs a different easing (faster accelerate
  or slower start). Crooked morph edges: smooth the path with more points [video].
- Honor reduced-motion preferences [practice].
- Durations: no numbers come from the source material; start around 150–250 ms for
  small UI transitions and tune by feel [practice].

## QA edge cases (agents miss these)

[video] Test by hand, in a real render:

- No network, empty/null data, very long text, text at maximum system size (clipping,
  overlap).
- Leaving and returning to the app: does state persist?
- Keyboard up: is the primary button still reachable and the keyboard dismissible?
- Very fast taps and swipes; animations after navigating away and back.
- One tap should not dim or break unrelated elements; focus should not be lost mid-flow.
- Performance: scroll jank, and never load an image ~10x larger than its displayed size.

## Premium is evidence of quality

The speaker's argument [video: Tim Gabe]: people have no "premium detector"; they keep a
quiet score of evidence that a product is good. Looking pretty gets a product picked;
evidence of quality gets it called premium. AI-built products converge on a similar
decent look, so the differences live in the parts that are usually skipped:

1. **Unglamorous states**: system status, undo, error recovery, an "it did something"
   response for every action. A silent no-op is where users are lost.
2. **Consistency across screens**: one pattern for the same job (for example one
   "sessions used" screen with a count and a refresh date instead of two different
   dead-ends). The product should feel like one product.
3. **Failure moments**: an error that says what happened, what to do next, and gives the
   action (check balance, contact support). The speaker cites a "service recovery
   paradox" (a well-handled failure can leave people as satisfied as no failure); treat
   it as an argument, not a verified result.

His statistics and studies were not checked; do not quote them as facts.

Three exercises to run on any UI:

- Walk the core flow: does the user know what just happened, can they undo it, and do
  they know what to do next?
- Use the product for an hour like a real user and list every place it stops feeling
  like the same product.
- Break it on purpose (Wi-Fi off mid-flow, failed payment, empty lists) and design those
  states as carefully as the success path.
