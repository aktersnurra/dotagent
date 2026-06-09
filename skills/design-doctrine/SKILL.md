---
name: design-doctrine
description: Use when designing domain modules, state machines, verifier pipelines, LLM-mediated workflows, artifact application flows, or evolvable domain cores where correctness depends on explicit states, structured errors, deterministic verification, and effects at boundaries.
---

# Design Doctrine

Optimize for readable, explicit, evolvable domain code.

## Core Rule

**Closed core, open edges.**

The core domain must use explicit states, commands, events, verified artifacts, and structured errors. Extension should happen by adding new rules, verifiers, interpreters, projections, or annotation layers, not by weakening the core model.

Use this alongside `type-driven-development` when the language can encode the invariants in types. This skill defines the domain architecture; type-driven development defines how to make illegal states unrepresentable when possible.

## State Modeling

Avoid boolean or status-string state machines.

Prefer tagged states:

- `Draft`
- `Parsed`
- `Resolved`
- `Verified`
- `Applied`
- `Failed(reason)`

Do not allow ordinary business logic to receive raw or unverified maps when a verified domain type should exist.

## State Changes

State-changing flows must be:

```text
Command/Input
-> pure decision or verifier
-> typed event/artifact
-> atomic application
-> projection update
```

LLM output is never trusted directly. It proposes artifacts. Deterministic verifiers decide whether those artifacts can be applied.

## Errors

All domain errors must be structured:

```elixir
%Tore.Error{
  code: atom(),
  message: String.t(),
  context: map()
}
```

Do not return bare strings from domain or verifier code.

When using this outside Tore or Elixir, preserve the shape: stable error code, human-readable message, and machine-readable context.

## Effects

Keep effects at the boundary:

- DB
- LLM
- scraper
- OCR
- filesystem
- clock
- HTTP
- notifications

The domain core should be deterministic and easy to test.

## Interfaces

Domain modules should expose small, uniform APIs:

- `new` / `validate` constructor
- `apply` / `evolve` transition
- `to_view` projection
- `encode` / `decode` at boundaries
- `for_testing` helpers only when needed

## Flexibility

Use additive extension:

- Add a new rule instead of editing a giant conditional.
- Add a new projection instead of overloading one table.
- Add a new verifier instead of making validation generic and vague.
- Add metadata or annotations in separate layers when possible.

## Testing

- Every invariant gets a property test.
- Every complex artifact gets an expect/snapshot test.
- Every verifier gets examples for valid and invalid cases.

## Avoid

- Inheritance-style indirection.
- Generic maps for domain state.
- Catch-all event handlers.
- Stringly typed statuses.
- Macro-generated hidden business logic.
- Overuse of advanced type tricks without a clear bug-prevention payoff.
