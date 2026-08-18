# Pi Skill Toggle Popup Design

**Status:** Approved design, pending written review  
**Date:** 2026-08-18

## Summary

Add a searchable `/toggle-skills` popup to the existing global
`pi-skill-visibility` extension. The popup lets the user choose one of two
visibility modes for each exact skill installation:

- **Startup:** include the skill metadata in the model's startup context so the
  agent can select it automatically.
- **Manual:** omit the skill metadata from startup context while preserving its
  `/skill:<name>` command.

Choices persist in a user-owned override registry and survive package updates.
The existing 28-skill allowlist remains the default for skills without an
override.

## Goals

- Open a compact interactive popup with `/toggle-skills`.
- Show every skill in Pi's canonical loaded skill inventory, including local,
  project, npm-package, git-package, and manual-only skills.
- Toggle exact skill installations independently, even when names collide.
- Save choices globally and survive package installation or update.
- Apply choices immediately through Pi's normal reload lifecycle.
- Support Vim and Colemak-DH navigation.
- Preserve first-turn enforcement and `/skill:<name>` access for Manual skills.

## Non-goals

- Do not add a Disabled mode. Disabling a skill and removing its slash command
  remain package/settings concerns.
- Do not expose the package-disabled `ask-user` skill. Its package remains
  installed only for the `ask_user` tool and has `skills: []` in settings.
- Do not add per-project override layers, bulk actions, mouse interaction, a
  detail pane, or a standalone configuration editor.
- Do not replace Pi's resource discovery with a custom filesystem scanner.

## Terminology

The UI uses user-facing terms instead of frontmatter terms:

| UI mode | Agent Skills representation | Result |
|---|---|---|
| Startup | `disable-model-invocation` absent | Included in startup context and available as a slash command |
| Manual | `disable-model-invocation: true` | Omitted from startup context and available as a slash command |

## Popup

The popup uses the approved compact-list layout.

### Structure

1. A header shows `Skill visibility`, the number of discovered skills, and the
   number of pending changes.
2. A search row appears below the header.
3. A single scrollable list fills the body.
4. Each row shows:
   - skill name;
   - short source label;
   - `STARTUP` or `MANUAL` status;
   - a quiet `*` when the row differs from its saved effective mode.
5. A compact footer shows the primary keyboard controls.

The popup does not include a details pane. Duplicate names remain separate rows
and use their source labels to disambiguate installations.

### Search

Search matches case-insensitive tokens against:

- skill name;
- description;
- short source label;
- source path;
- effective mode.

All tokens must match. An empty result displays `No matching skills`.

### Keyboard model

The popup starts in Normal mode.

| Key | Normal mode action |
|---|---|
| `j` or `n` | Move down; `n` is the Colemak-DH alias |
| `k` or `e` | Move up; `e` is the Colemak-DH alias |
| `gg` | Jump to first row |
| `G` | Jump to last row |
| `Space` | Toggle Startup/Manual |
| `/` | Enter Search mode |
| `s` | Save and reload |
| `q` or `Esc` | Cancel without writing |

Arrow keys and `Ctrl+S` remain compatibility shortcuts but are not emphasized
in the footer.

Search mode accepts printable text. `Backspace` edits the query, `Enter` keeps
the query and returns to Normal mode, and `Esc` returns to Normal mode without
closing the popup. Vim/Colemak navigation aliases are interpreted only in Normal
mode, so search text remains ordinary text.

## Architecture

### Canonical inventory

The command reads `ctx.getSystemPromptOptions().skills`. This is the same loaded
`Skill[]` inventory Pi uses to build the system prompt. It avoids a second,
incomplete discovery implementation and works before the first model request.

The command canonicalizes each `filePath` and deduplicates canonical paths.
Each canonical `SKILL.md` path is the identity of one exact installation.

### Default policy

`policy.ts` keeps the checked-in 28-skill name allowlist as defaults:

- allowlisted names default to Startup;
- every other newly discovered skill defaults to Manual.

The allowlist is a fallback, not an immutable enforcement set.

### Override registry

User choices are stored at:

```text
${PI_CODING_AGENT_DIR:-~/.pi/agent}/skill-visibility.json
```

Schema:

```json
{
  "version": 1,
  "overrides": {
    "/canonical/path/to/SKILL.md": "manual",
    "/another/path/to/SKILL.md": "startup"
  }
}
```

Only `startup` and `manual` are valid modes. Unknown versions, malformed JSON,
non-object overrides, relative paths, and unknown mode values are invalid.

The registry is written with a temporary file and atomic rename. Saving prunes
overrides for paths no longer present in Pi's canonical inventory. Returning a
skill to its current checked-in default removes its override.

### Policy resolution

For each canonical skill path, resolve mode in this order:

1. exact-path override from the registry;
2. checked-in default by skill name;
3. Manual fallback.

The resolver is pure and independent from I/O and UI code.

### Frontmatter projection

The registry is the source of user intent. The extension still projects the
resolved mode into each skill's frontmatter when possible:

- Startup removes `disable-model-invocation`;
- Manual writes `disable-model-invocation: true`.

Projection keeps Pi's ordinary skill representation accurate between reloads.
Package updates may replace projected files, but the next startup reapplies the
registry. The existing minimal patching, line-ending preservation,
compare-before-write, atomic replacement, canonical deduplication, and
per-skill error isolation remain in force.

### First-turn prompt enforcement

`before_agent_start` loads the registry, resolves every canonical skill, applies
frontmatter projection, and rewrites Pi's exact skills prompt block from the
resolved Startup set. Therefore the first model request follows saved choices
even when a package update replaced frontmatter immediately before startup.

The extension runtime must not cache enforcement across a reload. Reload creates
a new runtime and reads the updated registry.

## Command flow

1. `/toggle-skills` verifies that Pi has an interactive UI.
2. Read Pi's canonical loaded skills through
   `ctx.getSystemPromptOptions().skills`.
3. Read and validate the override registry.
4. Canonicalize and deduplicate skill paths.
5. Resolve each row's effective mode.
6. Open the compact popup.
7. On cancel, return without writes or reload.
8. On save with no changes, notify `No skill visibility changes` and return
   without reload.
9. On save with changes:
   - derive the new minimal override registry;
   - write it atomically;
   - project resolved modes into affected skill files;
   - show one concise applied/skipped summary;
   - call `await ctx.reload()` and immediately return.

The handler treats `ctx.reload()` as terminal because code after it runs in the
old extension frame.

## Error handling

- **Headless mode:** notify that `/toggle-skills` requires interactive Pi.
- **No skills:** notify `No skills found` and do not open an empty popup.
- **Malformed registry:** emit one actionable warning, fall back to checked-in
  defaults for startup enforcement, and refuse to overwrite the registry from
  the popup.
- **Registry write failure:** keep the popup result unapplied, report the path
  and failure, and do not reload.
- **Skill file changed while open:** skip that projection instead of overwriting
  concurrent changes.
- **Read-only or malformed skill file:** preserve the registry choice, report
  the skipped projection, and continue. First-turn prompt enforcement still
  honors the registry.
- **Partial projection failure:** report applied and skipped counts, then reload
  because the registry was saved and remains authoritative.
- **Unknown prompt shape:** retain the existing diagnostic and avoid guessing at
  prompt text.

Notifications are concise and bounded. Full filesystem paths appear only where
they are needed to fix an error.

## Component boundaries

- `policy.ts`: checked-in defaults and pure default lookup.
- `registry.ts`: registry schema, validation, path selection, and atomic I/O.
- `resolver.ts`: exact-path identity, precedence, and effective-mode resolution.
- `frontmatter.ts`: minimal Agent Skills frontmatter projection.
- `enforcer.ts`: canonical deduplication and isolated file projection.
- `prompt.ts`: exact current-turn skills-block rewriting.
- `toggle-command.ts`: command orchestration and reload boundary.
- `toggle-model.ts`: popup state, filtering, Normal/Search modes, pending `g`,
  and Vim/Colemak key actions.
- `toggle-overlay.ts`: compact themed rendering through `ctx.ui.custom`.
- `index.ts`: extension registration and lifecycle adapters only.

These names may be adjusted during planning if an existing module already owns
the responsibility, but the boundaries remain separate.

## Testing

### Unit tests

- Default policy retains the approved 28 names.
- Resolver precedence is override, then name default, then Manual fallback.
- Canonical duplicate paths collapse to one exact installation.
- Registry parser accepts version 1 and rejects malformed data.
- Registry writes are atomic, minimal, and prune stale paths on save.
- Returning to the checked-in default removes an override.
- Search matches all documented fields and token semantics.
- Normal/Search mode transitions are deterministic.
- `j/k`, `n/e`, arrows, `gg/G`, Space, `/`, `s`, `q`, Esc, Enter,
  Backspace, and Ctrl+S produce the documented actions.
- Selection remains valid when filtering or changing list bounds.

### Command tests

- Headless and empty inventories notify without opening UI.
- Cancel writes nothing and does not reload.
- No-change save writes nothing and does not reload.
- Apply writes the registry, projects files, summarizes results, reloads once,
  and returns.
- Malformed registry cannot be overwritten.
- Registry failure prevents projection and reload.
- Partial projection failure preserves saved intent and still reloads.

### Integration tests

- Pi's canonical skill inventory populates the popup before the first model
  request.
- Startup and Manual rows preserve `/skill:<name>` commands.
- The first prompt contains exactly the resolved Startup set.
- A simulated package update that restores original frontmatter is corrected by
  the saved registry on the next startup.
- Installer and reload behavior remain idempotent.

## Migration and installation

Existing installations have no registry. The first startup therefore behaves
exactly like the current 28-skill policy. The registry is created only after the
first applied popup change.

`install-pi` continues installing the same global extension symlink. It does not
create or overwrite the user registry. Reinstalling dotagent or updating Pi
preserves user choices.

## Acceptance criteria

- `/toggle-skills` opens the compact popup in interactive Pi.
- The list represents Pi's canonical loaded skills and distinguishes exact
  installations.
- Startup/Manual changes persist through reload, restart, and package update.
- Manual skills retain their `/skill:<name>` commands.
- Vim `j/k` and Colemak-DH `n/e` both navigate in Normal mode.
- Search mode accepts ordinary text without navigation-key interference.
- Save reloads exactly once; cancel and no-change save do not reload.
- Malformed registry data is never silently overwritten.
- Existing skill visibility behavior is unchanged until the user saves an
  override.
