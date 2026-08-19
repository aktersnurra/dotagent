# `/toggle-skills` Popup Rendering Design

## Problem

`/toggle-skills` must remain a floating popup. The current uncommitted implementation calls `ctx.ui.custom(factory)` without overlay options, which turns the picker into an inline custom surface and does not satisfy the requirement.

The earlier floating implementation rendered unframed styled rows. Pi's overlay compositor correctly inserted those rows into the existing terminal viewport and preserved transcript content outside the overlay rectangle. Without an independent rectangular container, the popup rows visually merged with surrounding transcript rows and appeared interleaved or corrupted.

The previous attempt to apply `theme.bg("customMessageBg", ...)` to individual rendered lines produced visible striping and corruption. This design does not reuse that approach.

## User intent

The user opens `/toggle-skills` to review and change skill startup visibility without leaving the current Pi session. The picker is a present-tense action surface: the skill checklist is primary, while search, change count, and key hints are supporting information.

## Requirements

- Render `/toggle-skills` as a centered floating overlay.
- Give the overlay a visible, complete rectangular frame.
- Ensure every popup row occupies the full inner width so transcript characters cannot survive inside the frame.
- Preserve the compact checklist layout and existing keyboard controls.
- Preserve `ToggleModel`, command, registry, projection, fingerprint, reload, and RPC-guard behavior.
- Do not use per-line `theme.bg("customMessageBg", ...)` styling.
- Do not treat mocked `ctx.ui.custom()` tests or an isolated tmux capture as proof of visual correctness.
- Require confirmation from the user's actual Pi session before declaring the rendering fixed.

## Design

### Overlay invocation

`showSkillToggleUi()` will again call `ctx.ui.custom()` with:

- `overlay: true`
- centered positioning
- the existing responsive width and height constraints unless testing shows a constraint itself is invalid

The command-level `ctx.mode !== "tui"` guard remains unchanged.

### Framed popup component

A dedicated framed popup component will wrap the existing `ToggleModel`-driven content.

For an allocated width `W`:

- the top border renders exactly `W` visible columns;
- the bottom border renders exactly `W` visible columns;
- the inner width is `W - 2`;
- every content row is ANSI-aware truncated and padded to exactly the inner width;
- every content row is enclosed by a left and right border;
- every returned line therefore renders exactly `W` visible columns.

This makes the popup a complete rectangular render surface without depending on a themed background fill. Pi may continue preserving transcript content outside the overlay bounds, but no transcript content may remain inside the frame.

The frame is responsible only for rectangular containment. The existing body remains responsible for header, search state, visible-row windowing, selection styling, empty search results, footer hints, and degraded rendering.

### Sizing and degraded terminals

Normal terminals retain the compact header, search row, checklist, and footer. The frame's two border rows are included in height calculations so the overlay does not exceed `maxHeight` or lose its bottom border.

Narrow or short terminals retain a reduced framed view. Width and height calculations must never return lines wider than the allocated overlay width or more rows than the available terminal height.

### Interaction and data flow

The interaction flow is unchanged:

1. The command resolves skills and snapshots fingerprints.
2. The popup receives `ToggleRow[]` and creates `ToggleModel`.
3. Navigation, search, and toggling update only the model and request a render.
4. Save returns drafts; cancel returns without applying changes.
5. The command writes the registry, projects frontmatter changes, notifies, and reloads exactly as before.

No persistence or command behavior is moved into the popup frame.

## Alternatives considered

### Uniform `Box` background

A Pi TUI `Box` could apply one background across the popup. This is not selected because the previous themed-background attempt produced striping/corruption, and the user selected a visible frame. A frame provides containment without depending on terminal background-style interactions.

### Built-in `SettingsList`

`SettingsList` would reduce custom list rendering but would alter established search, key mappings, staged-save behavior, and `ToggleModel` integration. That is unnecessary scope and is rejected.

### Inline custom surface

An inline `ctx.ui.custom()` surface avoids overlay compositing but directly violates the popup requirement. It is rejected.

## Testing

Automated tests will verify behavior without claiming visual acceptance:

- `showSkillToggleUi()` passes `overlay: true` and the intended `overlayOptions`.
- Normal and degraded renders produce a complete frame.
- Every rendered line has the exact allocated width when a frame can be rendered.
- The top and bottom borders are present and interior rows have both side borders.
- A compositor-level regression test overlays the popup onto patterned base text and verifies that no base characters survive inside the popup rectangle.
- Existing save, cancel, search, toggle, width, height, command, RPC guard, registry, projection, and reload tests continue to pass.
- TypeScript diagnostics and typecheck pass.

The compositor regression test proves rectangular replacement semantics only. It does not prove that the popup looks correct in the user's terminal.

## Acceptance

Implementation is accepted only when all of the following are true:

1. Focused automated tests pass.
2. The full extension test suite passes.
3. Typecheck passes.
4. No blocking diagnostics remain in edited files.
5. `/toggle-skills` is opened in the user's actual Pi session over real transcript content.
6. The user confirms from live inspection or a screenshot that the popup is clearly framed, rectangular, readable, and free of row interleaving.

Until step 6 is complete, the work must be reported as awaiting visual confirmation, not fixed.

## Out of scope

- Changing skill resolution or canonicalization.
- Changing registry persistence or frontmatter projection.
- Changing keyboard mappings, search semantics, or staged-save behavior.
- Removing the RPC guard.
- Redesigning unrelated extension UI.
