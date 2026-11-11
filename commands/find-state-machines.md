---
description: Find implicit state machines in a codebase and report where they hide.
argument-hint: "[path-or-subsystem]"
---

# Find Implicit State Machines

Survey the codebase (or `$ARGUMENTS` if given) for implicit state machines: behavior
that has states and transitions but no explicit model.

```text
/find-state-machines [path-or-subsystem]
```

Use the `system-design` skill for the vocabulary and for what a good explicit model
looks like.

## What to look for

- Clusters of booleans or nullable fields that encode a mode (`isLoading`, `hasError`,
  `data == null`), especially when some combinations are invalid.
- String, integer, or enum `status`/`state`/`phase`/`kind` fields checked in several places.
- Timestamps or flags that mean a lifecycle step (`deleted_at`, `confirmed`, `sent`).
- Scattered `if`/`switch`/`match` on the same discriminator, in different files.
- Retry, backoff, reconnect, debounce, and polling logic with counters and flags.
- Multi-step flows: wizards, checkout, onboarding, auth handshakes, job pipelines.
- Order-dependent calls ("must call `init` before `start`") and objects that are only
  valid after some method ran.
- UI components whose behavior depends on a mix of local state, props, and effects.
- Database columns with an implied lifecycle, and workers that move rows between them.

## Method

1. Map the codebase. Search for the patterns above; read the surrounding code.
2. Group findings by the entity that owns the lifecycle, not by file.
3. For each candidate, derive the states and transitions as they exist in the code today.
   Do not invent states the code cannot reach.

## Report

For each state machine, ranked by risk (invalid states reachable, transitions
scattered, bugs likely):

- **Name** and `file:line` references for where the state lives and where it changes.
- **States** and **transitions** (event → from → to), as a compact table or list.
- **Illegal states** the current representation permits.
- **Problems**: missing transitions, unhandled states, races, duplicated checks.
- **Suggested explicit model**: one line (sum type, enum plus transition function,
  state-machine library), and whether it is worth the change.

Finish with a short ranked list of what is worth making explicit first. Skip trivial
two-state flags unless they are buggy.

This is a read-only survey: do not modify code.
