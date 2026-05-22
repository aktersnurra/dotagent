---
name: type-driven-development
description: >
  Type-driven design and railway-oriented programming. Use when designing
  modules, modelling errors, defining interfaces, or when the user mentions
  ADTs, phantom types, GADTs, illegal states, ROP, result chaining, state
  machines, holes-driven development, or parse-don't-validate. Also trigger
  when the user is designing session runners, protocol state machines, effect
  systems, or resource lifecycles where correctness depends on ordering of
  operations. Use when the user says "types first", "make illegal states
  unrepresentable", or "encode invariants".
---

## Philosophy

Types are specifications. The compiler is the first test suite.
Design so that illegal states cannot be constructed, not so that they are
caught at runtime.

The core workflow: **type, define, refine** — write the type signature first,
use typed holes to sketch the structure, fill in the implementation guided by
what the compiler demands. Never write implementation before types are settled.

## Illegal states

- Model domain constraints in types, not in validation functions.
- If a function can only be called in a certain context, encode that context
  as a phantom type or abstract type — don't document it.
- Prefer a precise type over a general type with a runtime check.
- **Parse, don't validate**: functions that check input should return a
  *different type* on success, not a bool. The successful parse is evidence.
  Use `private` types in OCaml, smart constructors in Haskell, enforced
  struct constructors in Elixir.

## Error handling

- Use the language's result/either type for expected failures. Never use
  exceptions for control flow.
- Chain results — do not unwrap and rewrap manually.
- Error types should be ADTs with named variants. Each variant is a
  distinct case, not a string.
- If a function cannot fail, its return type must not suggest it can.
- Do not use option/maybe where a result type carries useful error information.

## Phantom types and indexed types

- Use phantom type parameters to encode capabilities, states, or invariants
  that must be tracked across call sites.
- Phantom parameters should name what they represent, not how they are used:
  `'curvature`, `'perm`, `'state` — not `'a`, `'b`.
- Use indexed or dependent types where the language supports them to eliminate
  entire classes of runtime error.

## State machines

When a value has a lifecycle (open/closed, running/complete, authenticated/
anonymous), encode the state in the type. The goal: an invalid transition
should be a compile error, not a runtime error.

- Define uninhabited types for each state: `type closed`, `type open_`
- Thread the state through as a phantom parameter: `'state handle`
- Each operation consumes one state and produces another in its signature
- In Elixir, use pattern-matched struct constructors — crash loudly at the
  boundary, not silently in the interior

## Holes-driven development

Use typed holes to drive implementation top-down. Write the type, then use
`_` / `assert false` (OCaml), `?name` (Idris), or `todo!` (Rust) to sketch
the structure. Treat compiler errors as a conversation with the type system —
they tell you what each hole requires. Fill bottom-up once the shape is clear.

## Interface design

- The interface is the design artifact. Write it before the implementation.
- Abstract types are the primary encapsulation tool — not naming conventions.
- Every exposed function should have a clear postcondition expressible in its
  type. If it cannot, consider whether the type is precise enough.
- Do not expose constructors unless construction is part of the public API.

When approaching a new design, work through these in order:
1. What are the states? What are the valid transitions?
2. Which invariants can be encoded in the type? Which require runtime enforcement?
3. What does the type signature of each operation look like?

## What to avoid

- Unsafe casts or any escape from the type system.
- Exceptions as a substitute for result types.
- Boolean parameters where a sum type would name the cases.
- Stringly-typed data that has known structure.
- Nullable/optional returns where the absence case is actually an error.
- Validation functions that return bool instead of a refined type.
