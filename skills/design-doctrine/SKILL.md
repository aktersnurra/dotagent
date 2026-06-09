---
name: design-doctrine
description: Use when designing domain modules, state machines, verifier pipelines, LLM-mediated workflows, artifact application flows, durable data models, or evolvable domain cores where correctness depends on explicit states, structured errors, provenance, deterministic verification, and effects at boundaries.
---

# System Design Doctrine Skill

## Core maxim

**Elegant UX, strict domain model, boring implementation.**

Use this alongside `type-driven-development` when the language can encode invariants in types. This skill defines the system and domain architecture; type-driven development defines how to make illegal states unrepresentable when possible.

## Three-layer model

### Product design

Define the user experience and flow.

Start from what the user is trying to do, what trust they need at each step, and what must be visible, reversible, or explained.

### Domain design

Define states and transitions:

```text
Raw → Parsed → Resolved → Verified → Applied
```

Do not let ordinary business logic receive raw, unresolved, or unverified data when a stricter domain type should exist.

Prefer tagged states over booleans or status strings:

- `Raw`
- `Parsed`
- `Resolved`
- `Verified`
- `Applied`
- `Failed(reason)`

### Programming doctrine

Define constraints:

- no invalid states
- no unverified application
- structured errors
- isolated effects

State-changing flows must be explicit:

```text
Command/Input
→ pure parser/resolver/verifier
→ typed event/artifact
→ atomic application
→ projection update
```

## Principles

### Parse, don’t validate

Transform data into better types instead of checking raw data repeatedly.

### Make illegal states unrepresentable

Use explicit states, constructors, and opaque types instead of flags, strings, or generic maps.

### Interfaces are architecture

Use small module boundaries to enforce invariants. Domain modules should expose a narrow, uniform API:

- `new` / `validate` constructor
- `apply` / `evolve` transition
- `to_view` projection
- `encode` / `decode` at boundaries
- `for_testing` helpers only when needed

### Effects at the boundary

Keep the domain core pure and deterministic. Push IO to edges:

- database
- LLM
- scraper
- OCR
- filesystem
- clock
- HTTP
- notifications

### AI proposes, code disposes

LLM output is never trusted directly. It proposes artifacts; deterministic verifiers decide whether those artifacts can be applied.

### Version durable data

Never silently change historical data. Version schemas, formats, prompts, verifier decisions, and persisted artifacts when compatibility or auditability matters.

### Derived state is explicit

Store facts. Compute views. Keep projections, summaries, indexes, and caches visibly derived from source facts.

### Provenance is first-class

Track source, confidence, origin, verifier, timestamp, and transformation path wherever trust matters.

### Closed core, open edges

Core states and invariants are fixed. Extensions are additive: add rules, verifiers, interpreters, projections, annotation layers, or edge adapters without weakening the core model.

### Flexible ≠ shapeless

Use structured extensibility, not generic maps. Add explicit metadata or annotation layers when flexibility is needed.

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

## Workflow

For each feature, define:

- UX contract
- Domain flow
- Source facts
- Derived projections
- Invariants
- Effects
- Trust boundaries
- API sketch
- Tests

## Testing

- Property tests → invariants
- Expect/snapshot tests → behavior and complex artifacts
- Verifier examples → valid and invalid cases

## Avoid

- Inheritance-style indirection
- Generic maps for domain state
- Catch-all event handlers
- Stringly typed statuses
- Macro-generated hidden business logic
- Overuse of advanced type tricks without a clear bug-prevention payoff
- Silent mutation of durable history
- Applying unverified LLM output

## Final rule

Every important boundary increases trust.  
Every important state encodes knowledge.  
Every important change leaves a trace.
