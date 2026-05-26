---
name: tiger-style
description: Tiger Style naming and API design conventions, derived from
  TigerBeetle's style guide. Use when naming functions, types, variables,
  modules, or designing any public API surface.
---

## Core principle

Names are assertions. A name should make a true statement about what a thing
is or does. If you cannot state it precisely, the design is not clear yet.

## Naming

- Names are as long as they need to be and no longer. Precision over brevity,
  but not verbosity for its own sake.
- No abbreviations unless the abbreviation is the canonical term
  (e.g. `rpc`, `tcp`, `lsn`).
- No filler words: not `data`, `info`, `manager`, `handler`, `util`, `helper`.
- Functions that return `bool` are named as predicates: `is_valid`, `has_capacity`,
  `can_commit` — not `check`, `validate`, `verify`.
- Functions that mutate state use verbs that name the state transition:
  `commit`, `release`, `drain` — not `process`, `handle`, `do`.
- Types name the thing, not the representation: `replica_count` not `replica_int`,
  `timeout_ms` not `timeout`.

## API surface

- The smallest API that solves the problem. Every exposed name is a commitment.
- No convenience wrappers unless they eliminate a genuine usage pattern.
- No optional arguments that paper over a confused design.
- Caller should not need to read the implementation to use the API correctly.
- If a precondition exists, encode it in the type or assert it immediately —
  do not leave it as a doc comment.

## Invariants and assertions

- Assert invariants at boundaries, not throughout.
- An assertion failure is a bug in the caller, not an expected error.
  Use `result` for expected errors, assertions for impossible states.
- Name the invariant in the assertion message: `assert (left <= right)`
  not `assert false`.

## Comments

- Comments explain why, not what. The code explains what.
- If a comment is needed to explain what the code does, the code should
  be rewritten or the names improved.
- Cite sources for non-obvious algorithms or constants.

## What to avoid

- Names that require context to decode: `do_the_thing`, `process_items`.
- Mirrored names that differ only by negation: prefer a single authoritative
  name and derive the other.
- Overloaded names: one concept, one name throughout the codebase.
