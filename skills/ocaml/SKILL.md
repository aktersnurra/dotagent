---
name: ocaml
description: OCaml-specific idioms and library conventions. Use when writing
  or reviewing OCaml code, or when the user mentions Eio, Lwt, effect handlers,
  GADTs, functors, module types, QCheck, Ortac, dune, Base, Core, Sexplib,
  Command, config-as-code, or algebraic effects.
---

## Type-driven design in OCaml

- The `.mli` is the design artifact. Write it first.
- Use GADTs to enforce protocol states, expression invariants, or capability
  constraints at the type level. Keep constructors close to their eliminator.
- Phantom type parameters name what they represent: `'curvature`, `'perm`,
  `'state` — not `'a`, `'b`.
- Abstract types are the primary encapsulation tool — not naming conventions.
  Do not expose constructors unless construction is part of the public API.
- Use `result` for expected failures, `let*` / `Result.bind` for chaining.
  Never use exceptions for control flow.
- Error types are ADTs with named variants, not strings.
- Polymorphic comparison (`=`, `<`) is forbidden on non-primitive types —
  use `Type.compare` or derive `equal`/`compare` explicitly.

## Libraries and tooling

- Use `Base` by default for all new code. It removes polymorphic comparison,
  provides consistent `Option`, `List`, `Result` APIs, and replaces the
  stdlib's unsafe defaults.
- Use `Core` when you need Unix, time, or system-level functionality.
- Derive `sexp`, `compare`, and `equal` with `ppx_jane` / `ppx_sexp_conv`
  rather than writing them manually.
- `Map` and `Set` in `Base` require a comparator witness — a phantom type
  that singles out a specific comparison function. Use `Comparable.Make` or
  `Comparator.Make` on your module to produce one. This is the standard
  real-world phantom type pattern: the witness is not data, it is evidence.
- For command-line interfaces use Jane Street's `Command` library, not `Arg`
  or `getopt`. It is typed, composable, and self-documenting. Subcommands are
  first-class values.

## Concurrency

- Eio is the default for all new code. Never introduce Lwt except in
  MirageOS/unikernel contexts where it is the only option.
- Use structured concurrency: `Eio.Switch` for resource lifetimes,
  `Fiber.fork_promise` for parallel work.
- Do not mix Eio and Lwt in the same module.

## Effect handlers

- Effects are the preferred abstraction for IO, dependency injection, and
  cooperative concurrency in OCaml 5. Prefer effects over monads for new code:
  no `let%bind` noise, no monad-infected standard library functions, composes
  cleanly with unboxed types and local mode.
- Define effect operations as a GADT in a dedicated `Effect_ops` module, then
  apply `Handled_effect.Make` to produce the effect module. The GADT specifies
  what operations a computation can perform and their return types.
- A computation has type `E.Handler.t @ local -> 'a`. The handler must be
  `local` — this is a type-safety guarantee enforced by the compiler, not a
  style choice. It prevents performing effects outside a live handler scope.
- The handler receives a `continuation` when an effect is performed. Resume
  with `Handled_effect.continue k value`. You can defer or discard continuations
  to implement cooperative scheduling, resource cleanup, or simulation stepping.
- Effects are for IO abstraction and dependency injection, not arbitrary control
  flow. Define effects in a dedicated module; keep the handler close to the
  entry point.
- Name effects as actions: `Read`, `Write`, `Step`, `Yield` — not `Effect1`.

## Configuration as code

Follow the Jane Street approach: configuration is OCaml values, not external
files. This gives you the type system, the module system, and the compiler
for free.

- Represent configuration as `Sexp`-serializable records using `ppx_sexp_conv`.
  Configuration round-trips through `Sexp.t` for serialization, logging, and
  diffing — without schema drift.
- Parse and validate configuration at the boundary using smart constructors
  that return `result`. The validated type flows through the rest of the system.
  Never pass raw strings or unvalidated values into the core.
- Expose configuration via the `Command` library. Each field is a typed flag
  with a description. The CLI is generated from the type, not written by hand.
- Prefer a private type or `Validated.t` for config fields with invariants
  (e.g. a port number that must be in range, a non-empty string).
- Configuration modules should have a `t` type, a `default : t`, and a
  `param : t Command.Param.t` that callers compose into their command.

## Module system

- Prefer small, focused modules with explicit `.mli` files.
- Use functors for parameterising over implementations, not for code reuse.
- Do not `open` modules at the top level except `Base` / `Core`.
  Use local opens (`let open M in`) or qualified names.
- Module type aliases (`module type S = M.S`) keep interfaces stable.
- The `.mli` is the unit of code review — implementations are details.

## Testing

- Property-based tests with QCheck are preferred over example-based tests
  for pure functions.
- Use QCheck-STM for stateful systems.
- Use Ortac/Gospel for specification and runtime assertion where applicable.
- Never skip tests in hobby or library projects.
- Test file convention: `test/test_<module>.ml`, registered in dune.

## Naming and style

- Type names are lowercase: `t` for the primary type of a module.
- Constructor names are CamelCase.
- Use labeled arguments when a function takes multiple values of the same type.
- Use optional arguments only when absence has a sensible default — not as
  a convenience to avoid building a record.
- Avoid `_opt` suffix variants unless the caller genuinely needs both.
- Enable warnings as errors in development: `-w @A-4-33-40-41-42-43-34-44`.
  Do not enable this in distributed packages — the warning set grows between
  compiler releases.

## Build

- dune is the build system. Do not generate Makefile wrappers over dune.
- Libraries go in `lib/`, executables in `bin/`, tests in `test/`.
- Inline tests (`(inline_tests)`) only for trivial sanity checks;
  real tests go in `test/`.

## What to avoid

- `Obj.magic` or any unsafe module.
- `try/with` for control flow — use `result`.
- Mutable state outside of explicit, documented boundaries.
- Lwt outside of MirageOS contexts.
- Monads where effects serve the same purpose in OCaml 5 code.
- Polymorphic comparison on non-primitive types.
- External config files (YAML, JSON, env vars) where an OCaml value with
  `ppx_sexp_conv` would do.
