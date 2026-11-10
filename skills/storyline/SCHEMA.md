# Story schema

A story is one JSON file. The viewer and `validate.mjs` read it. The source of truth is
`viewer/src/story.ts`; this page is the short version. Validate with
`node ~/.claude/skills/storyline/viewer/dist/validate.mjs story.json` and fix every reported
problem. The validator checks the story's shape. With `--repo <repo root>` it also checks every
anchor and every `CodeRef` against the files at `revision`, and with `--diff` the hunks of a PR
story against the real diff.

## Story

```json
{
  "kind": "codebase" | "pr",
  "revision": "a1b35ba",
  "title": "Short name of the story",
  "levels": [{ "level": 0, "name": "System" }, { "level": 1, "name": "Modules" }],
  "blocks": [ ... ],
  "edges": [{ "from": "id", "to": "id", "kind": "calls" | "depends" | "reads-before" | "changes" }]
}
```

- `revision` is the commit the story describes. Every anchor must use the same value.
- `levels` name the zoom levels. A PR story needs only level 0.
- `edges` join sibling blocks (same level, same parent). Direction: `from` calls `to`; `from`
  depends on `to`; `from` is read before `to`; `from` changes `to`. The key is required. A PR story
  normally has none: write `"edges": []`.

## Blocks

Every block has: `_tag`, `id` (unique), `label` (1-3 words, shown in the outline and the map), `title` (one
sentence, shown as the heading), `summary` (1-3 sentences), `level` (0 = top), optional `parent`
(id of a block one level up), and `anchors`. A top-level block of a PR story also has `section`.

An anchor is `{ "path", "startLine", "endLine", "revision" }`: `path` is relative to the repo
root, and the lines are 1-based and inclusive at `revision`.
Get line numbers from the file at that revision (`jj file show -r <rev> <path> | cat -n`), not
from the working copy, and copy `code` from the same output.

| `_tag` | Extra fields | Anchors |
|---|---|---|
| `Summary` | none | may be empty |
| `Concept` | none | may be empty |
| `Flow` | `steps`: non-empty list of strings | at least one |
| `CodeRef` | `code`: the exact text of the first anchor's lines, joined with `\n` | at least one |
| `Diff` | `reason`, `hunks`: non-empty list of `{ path, patch }` | at least one |
| `Risk` | `severity`: `low`, `medium` or `high` | at least one |

A newline at the end of `code` or of a hunk's `patch` is accepted and ignored.

Anchor every claim about code. A `Summary` or `Concept` that says something specific about a
file should still carry an anchor.

## Codebase stories

- `kind` is `"codebase"`. `levels` names each depth you use, for example
  `[{ "level": 0, "name": "System" }, { "level": 1, "name": "Parts" }]`.
- A block at level 1 or deeper has `parent`: the id of a block exactly one level up. Level 0
  blocks have none.
- Blocks are read in array order, each followed by its parts. Order them for a newcomer.
- `edges` may only join blocks with the same level and the same parent. They are drawn as arrows
  in the map and listed as links under each section.
- `Diff` and `Risk` blocks and `section` belong to PR stories; do not use them here.

## PR stories

- `kind` is `"pr"` and `levels` is one entry, for example `[{ "level": 0, "name": "Change" }]`.
- Every top-level block (level 0) has `section`: `"background"` or `"review"`. Codebase stories
  must not use `section`.
- `background` blocks (usually `Summary` and `Concept`) say what a reviewer needs before reading
  the change. The viewer shows them under "Before you read the change".
- `review` blocks (`Diff` and `Risk`) are the walkthrough, in array order. The viewer numbers them
  all, risks included, "Step n of N". `reason` on a `Diff` says why it sits at that position. Put
  a `Risk` straight after the `Diff` it concerns, or at the end when it spans several.
- Each `hunks` entry is exactly one hunk. `path` is the repo-relative path without the `a/` or
  `b/` prefix; for a deleted file it is the old path. `patch` is copied exactly from
  `diff --git` output, from the hunk's `@@` line to the last line before the next `@@` or
  `diff --git`, lines joined with `\n`. Do not retype it from memory: copy it. `validate.mjs --diff change.diff` checks
  that every hunk is really in the diff and that no hunk of the diff is left out.
- A `Diff` that only deletes a file has no lines left to anchor at `revision`. Anchor it to the
  code that replaces the file or that used to refer to it.
