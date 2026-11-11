---
name: bonsai
description: Use when building, debugging, testing, or reviewing Jane Street Bonsai web apps in OCaml, including Bonsai.t, local graph, let%arr, match%sub, state machines, Vdom, Effect.t, Bonsai.assoc, Bonsai.peek, or Bonsai_web_test. Targets bleeding-edge upstream master rather than legacy Proc or Arrow APIs.
---

# Bonsai

Bonsai composes incremental values and state machines; rendering is one consumer
of that graph. Target the current **Cont / graph API**, not examples returning
`Computation.t`.

## Before editing

1. Check the project's compiler, package pins, Dune files, and nearby components.
   Consult current [`cont.mli`](https://github.com/janestreet/bonsai/blob/master/src/cont.mli)
   and the relevant web/test interface before copying an API.
2. Follow the [current API reference](references/current-api.md) for signatures,
   freshness, state lifetime, build setup, tests, and pinned source evidence.
3. Keep existing compiler syntax: OxCaml uses `(graph @ local)`; older docs use
   `(local_ graph)`; exported examples also use plain `graph`. Do not mix syntax
   generations or assume the opam minimum guarantees every README example compiles.

## Core pattern

Declare stateful structure with `graph`, derive values with `let%arr`, and return
an effect from event handlers. Components can return separate `Bonsai.t`s; they
need not bundle everything into a reactive tuple.

```ocaml
open! Core
open Bonsai_web
open Bonsai.Let_syntax

let counter graph =
  let count, inject =
    Bonsai.state_machine
      ~default_model:0
      ~apply_action:(fun _ctx count () -> count + 1)
      graph
  in
  let%arr count and inject in
  Vdom.Node.button
    ~attrs:[ Vdom.Attr.on_click (fun _ -> inject ()) ]
    [ Vdom.Node.text (Int.to_string count) ]
;;

let () = Start.start ~bind_to_element_with_id:"app" counter
```

This uses the exported master's syntax. The host HTML needs an element with
`id="app"`. Action-based increments use the current model rather than a count
captured when rendering.

## Quick reference

| Need | Primitive / rule |
|---|---|
| Constant or pure reactive derivation | `Bonsai.return`, `let%arr ... and ...` |
| Replacement state | `Bonsai.state initial graph` |
| Transitions based on current model | `Bonsai.state_machine` |
| Transition reading reactive input | `Bonsai.state_machine_with_input`; handle `Inactive` |
| Independent state for every map key | `Bonsai.assoc` with stable domain keys |
| One active key with remembered state | `Bonsai.scope_model` |
| Stateful conditional | `match%sub` inside a component taking `graph` |
| Read fresh data inside an effect | Allocate `Bonsai.peek value graph`; bind its effect |
| React to changes / activation | `Bonsai.Edge.on_change` / `lifecycle` |
| Deterministic interaction tests | `Bonsai_web_test.Handle`, `Result_spec.vdom` |

## Common mistakes

- Constructing state inside `let%arr` or event callbacks: build structure before
  reactive mapping; use `assoc` or `match%sub` for dynamic stateful structure.
- Mutating models or doing I/O during derivation: use immutable transitions and
  scheduled `Effect.t`s. Bonsai effects are not OCaml algebraic effects or Eio.
- Reading a captured value after setting state: sequencing does not refresh the
  closure; use `peek` and handle `Active` / `Inactive`.
- Treating deactivation as destruction: keyed/conditional state is retained;
  use explicit reset semantics when required.
- Guessing APIs from older tutorials: prefer current interfaces over prose,
  including deprecated `state_machine0/1`, `Value.t`, and `yoink` spellings.

## Verification

Use the repository's build and JavaScript test aliases. Check initial output,
interaction, changed inputs, and deactivate/reactivate behavior. Assert generated
output; do not invent expect snapshots or claim compilation from source inspection.
