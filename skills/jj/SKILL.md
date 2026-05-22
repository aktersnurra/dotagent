---
description: Jujutsu (jj) version control idioms and workflows. Use whenever
  the user mentions jj, jujutsu, bookmarks, revsets, commits, rebasing,
  or any version control operation in this repository.
---

## Core model

- jj has no index/staging area. Every file change is immediately part of
  the current working-copy commit (@).
- Commits are rewritable by default. Amending, rebasing, and reordering
  are normal operations, not exceptional ones.
- Never suggest `git` commands. All VCS operations use `jj`.

## Workspaces (default workflow for feature work)

- **Always use workspaces for new features.** Do not start feature work
  directly on `@` in the root workspace.
- `jj workspace add <path>` — create a new workspace at the given path
  (typically a sibling directory); each workspace gets its own working
  tree and independent `@`.
- `jj workspace list` — list all workspaces and their working-copy commits.
- `jj workspace root` — print the root path of the current workspace.
- `jj workspace forget <name>` — unregister a workspace from the repo
  (does not delete the directory; remove it manually afterwards).
- `jj workspace rename <old> <new>` — rename a workspace.
- `jj workspace update-stale` — recover a workspace whose working-copy
  commit has been rewritten from another workspace.
- Workspaces share the same jj repo storage and history; each has an
  independent `@`. Changes in one workspace are immediately visible to all.
- Typical tmux / parallel Claude Code setup:
  ```
  # From the root repo directory:
  jj workspace add ../repo-feature-a
  jj workspace add ../repo-feature-b
  # Each tmux pane: cd into the respective sibling directory
  ```
- Do not use `jj new` as a substitute for workspace isolation when running
  parallel sessions.

## Basic operations

- `jj st` — status (alias for `jj status`)
- `jj log` — history (default graph view)
- `jj diff` — diff of working copy
- `jj describe -m "message"` — set commit message for current change
- `jj new` — start a new change on top of @
- `jj squash` — fold working copy into parent
- `jj split` — split current change into two
- `jj edit <rev>` — move @ to an existing commit for amendment
- `jj undo` — undo the last operation

## Commit messages

- Use Conventional Commits for `jj describe -m` messages:
  `type(scope): imperative subject`.
- Prefer these types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`,
  `build`, `ci`, `chore`, `revert`.
- Include a scope when it clarifies the affected area: `docs(jj): add
commit message guidance`.
- Use imperative mood and keep the subject concise: `fix(auth): reject
expired sessions`, not `fixed auth sessions`.
- For breaking changes, use `!` after the type or scope and add a
  `BREAKING CHANGE:` footer in the message body.
- Match the message to the actual change. If the working copy contains
  unrelated changes, split first with `jj split` instead of writing a broad
  message.

## Bookmarks (not branches)

- jj uses bookmarks, not branches. The concept maps roughly but the
  commands differ.
- `jj bookmark create <name>` — create bookmark at current revision
- `jj bookmark set <name>` — create or move a bookmark to current revision
- `jj bookmark list` — list all bookmarks
- `jj bookmark delete <name>` — delete a bookmark
- `jj bookmark move <name> --to <rev>` — move a bookmark to a revision
- Do not use `git branch` terminology or commands.

## Rebasing and history

- `jj rebase -d <destination>` — rebase current change onto destination
- `jj rebase -s <source> -d <destination>` — rebase a subtree
- `jj abandon <rev>` — discard a change (not `git reset`)
- `jj restore --from <rev> <path>` — restore file from another revision
- After rebase, divergent bookmarks may need: `jj bookmark set <name> -r @`

## Revsets

- jj uses revsets for addressing commits — prefer them over raw hashes.
- `@` — working copy
- `@-` — parent of working copy
- `trunk()` — the main branch equivalent
- `ancestors(@)` — all ancestors
- `bookmarks()` — all bookmark targets
- Use revsets in commands: `jj log -r 'ancestors(@, 5)'`

## Remote operations

- `jj git fetch` — fetch from remote (not `git fetch`)
- `jj git fetch -b <bookmark>` — fetch a specific bookmark from remote
- `jj git push` — push to remote (not `git push`); safe by default,
  only updates remote if it matches last-fetched state
- `jj git push -b <name>` — push a specific bookmark
- `jj git push --all` — push all bookmarks

## Conflict resolution

- jj materialises conflicts in files rather than halting operations.
- `jj resolve` — open conflict resolver
- Conflicts can be committed and resolved later — this is intentional.
- Do not attempt to resolve conflicts with raw file edits unless the
  conflict markers are simple.

## GPG signing

- If commits require GPG signing, ensure `jj` is configured with the
  correct signing key before pushing.
- `jj config set --user signing.key <keyid>`

## What to avoid

- Never run `git` commands directly in a jj-managed repo except for
  operations jj explicitly delegates (e.g. `jj git push` calls git
  under the hood — do not double-invoke).
- Never use `git commit`, `git add`, `git checkout`, `git branch`.
- Do not suggest `git stash` — use `jj new` to park changes instead.
- Do not start feature work directly on `@` in the root workspace —
  use `jj workspace add` instead.
- Do not use `jj git push --force-with-lease` — this flag does not
  exist; jj push is already safe-by-default.
