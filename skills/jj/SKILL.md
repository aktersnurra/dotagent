---
name: jj
description: Jujutsu (jj) version control idioms and workflows. Use whenever
  the user mentions jj, jujutsu, bookmarks, revsets, commits, rebasing,
  or any version control operation in this repository.
---

## Core model

- jj has no index/staging area. Every file change is immediately part of the current
  working-copy commit (@).
- Commits are rewritable by default. Amending, rebasing, and reordering are normal
  operations, not exceptional ones.
- Never suggest `git` commands. All VCS operations use `jj`.

## Workspaces

- Use a normal `jj new` for most feature work in a single checkout.
- Use `jj workspace add` only when you need multiple working trees at the same time, for
  example parallel agents, long-running tests, or comparing two independent edits side
  by side.
- Do not create ad-hoc feature workspaces directly as random siblings of the repo.
  Prefer a dedicated workspace container directory.

Recommended layout:

```sh
# From the root repo directory:
mkdir -p ../repo.workspaces
jj workspace add ../repo.workspaces/feature-a --name feature-a
jj workspace add ../repo.workspaces/feature-b --name feature-b
```

Each workspace has its own working tree and independent `@`, but shares the same jj repo
storage and history. Changes created in one workspace are visible from the others
through normal jj history.

Useful commands:

```sh
jj workspace list
jj workspace root
jj workspace rename <old> <new>
jj workspace update-stale
```

Cleaning up a workspace:

```sh
# From any workspace:
jj workspace forget <name>
rm -rf ../repo.workspaces/<name>
```

Or, from inside the workspace being removed:

```sh
jj workspace forget
cd ..
rm -rf <workspace-dir>
```

`jj workspace forget` only unregisters the workspace from jj. It does not delete the
directory.

Typical tmux / parallel Claude Code setup:

```sh
# From the root repo directory:
mkdir -p ../repo.workspaces
jj workspace add ../repo.workspaces/agent-a --name agent-a
jj workspace add ../repo.workspaces/agent-b --name agent-b

# Each tmux pane: cd into the respective workspace directory.
```

Do not use workspaces as a substitute for normal jj changes. Use:

```sh
jj new
```

when you only need to start a new change in the current checkout.

## Basic operations

- `jj st` — status (alias for `jj status`)
- `jj log` — history (default graph view)
- `jj diff` — diff of working copy
- `jj diff --git` — Git-style unified diff, useful for patches and LLMs
- `jj describe -m "message"` — set commit message for current change
- `jj new` — start a new change on top of @
- `jj squash` — fold working copy into parent
- `jj split` — split current change into two
- `jj edit <rev>` — move @ to an existing commit for amendment
- `jj undo` — undo the last operation

## Recommended diff configuration

Prefer Git-style diffs so patches are easier for humans, tools, and LLMs to understand.

```sh
jj config set --user ui.diff.format git
jj config set --user diff.git.show-path-prefix true
jj config set --user diff.git.context 3
```

Equivalent config:

```toml
[ui.diff]
format = "git"

[diff.git]
show-path-prefix = true
context = 3
```

After this, plain `jj diff` should emit familiar Git-style unified diffs.

## Commit messages

- Use Conventional Commits for `jj describe -m` messages:
  `type(scope): imperative subject`.
- Prefer these types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
  `chore`, `revert`.
- Include a scope when it clarifies the affected area:
  `docs(jj): add commit message guidance`.
- Use imperative mood and keep the subject concise:
  `fix(auth): reject expired sessions`, not `fixed auth sessions`.
- For breaking changes, use `!` after the type or scope and add a `BREAKING CHANGE:`
  footer in the message body.
- Match the message to the actual change. If the working copy contains unrelated
  changes, split first with `jj split` instead of writing a broad message.

## Bookmarks (not branches)

- jj uses bookmarks, not branches. The concept maps roughly but the commands differ.
- `jj bookmark create <name>` — create bookmark at current revision
- `jj bookmark set <name>` — create or move a bookmark to current revision
- `jj bookmark list` — list all bookmarks
- `jj bookmark delete <name>` — delete a bookmark
- `jj bookmark move <name> --to <rev>` — move a bookmark to a revision
- Do not use `git branch` terminology or commands.

## Rebasing and history

- `jj rebase -d <destination>` — rebase current change onto destination
- `jj rebase -s <source> -d <destination>` — rebase a subtree
- `jj abandon <rev>` — discard a change, not `git reset`
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

- `jj git fetch` — fetch from remote, not `git fetch`
- `jj git fetch -b <bookmark>` — fetch a specific bookmark from remote
- `jj git push` — push to remote, not `git push`; safe by default, only updates remote
  if it matches last-fetched state
- `jj git push -b <name>` — push a specific bookmark
- `jj git push --all` — push all bookmarks

## Conflict resolution

- jj materialises conflicts in files rather than halting operations.
- `jj resolve` — open conflict resolver
- Conflicts can be committed and resolved later — this is intentional.
- Do not attempt to resolve conflicts with raw file edits unless the conflict markers
  are simple.

## GPG signing

- If commits require GPG signing, ensure `jj` is configured with the correct signing key
  before pushing.
- `jj config set --user signing.key <keyid>`

## What to avoid

- Never run `git` commands directly in a jj-managed repo except for operations jj
  explicitly delegates, for example `jj git push` calls git under the hood — do not
  double-invoke.
- Never use `git commit`, `git add`, `git checkout`, `git branch`.
- Do not suggest `git stash` — use `jj new` to park changes instead.
- Do not create random sibling directories for workspaces. Use a dedicated workspace
  container such as `../repo.workspaces/`.
- Do not use workspaces when a simple `jj new` in the current checkout is enough.
- Do not use `jj git push --force-with-lease` — this flag does not exist; jj push is
  already safe-by-default.
