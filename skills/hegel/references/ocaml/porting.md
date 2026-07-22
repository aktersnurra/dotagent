# Porting OCaml PBT Libraries to Hegel

## From QCheck / QCheck2

QCheck(2) is the dominant OCaml PBT library. Main differences:

- QCheck is declarative (arbitraries built from combinators, passed to `Test.make`); hegel is imperative (`draw tc gen` calls inside the test body, or sequential draws inside `composite`).
- QCheck shrinks in-process via `Shrink` functions attached to each arbitrary; hegel delegates shrinking to a server — no shrink implementation needed.
- QCheck2 properties return `bool` (optionally raising `QCheck2.Test.Test_fail`); hegel tests use plain `assert`, or `require`/`require_equal` for structured failure reports.
- QCheck arbitraries are typically named `Arb`/`gen` values built once and reused; hegel generators are also values, but combinators like `composite` read like ordinary imperative code rather than a combinator pipeline.

### Test Structure

QCheck2:

```ocaml
let test_addition =
  QCheck2.Test.make ~name:"addition" ~count:100
    QCheck2.Gen.(pair (int_range 0 99) (int_range 0 99))
    (fun (a, b) -> a + b >= a && a + b >= b)

let () = QCheck_base_runner.run_tests_main [ test_addition ]
```

Hegel:

```ocaml
open Hegel
open Hegel.Generators

let%hegel_test test_addition tc =
  let a = draw tc (integers ~min_value:0 ~max_value:99 ()) in
  let b = draw tc (integers ~min_value:0 ~max_value:99 ()) in
  assert (a + b >= a && a + b >= b)
```

But consider: should those bounds be there at all? If the property is about addition, test the full range unless there's a reason not to — see the main skill's Generator Discipline section.

### Gen → Generator Mapping

| QCheck2 `Gen` | Hegel |
|---------------|-------|
| `Gen.int` | `integers ()` |
| `Gen.int_range 0 99` | `integers ~min_value:0 ~max_value:99 ()` |
| `Gen.small_int` | `integers ~min_value:0 ~max_value:100 ()` (pick bounds matching intent) |
| `Gen.bool` | `booleans ()` |
| `Gen.float` | `floats ()` |
| `Gen.string` | `text ()` |
| `Gen.string_size (Gen.int_range 1 10)` | `text ~min_size:1 ~max_size:10 ()` |
| `Gen.char` | `characters ()` |
| `Gen.list gen` | `lists gen ()` |
| `Gen.list_size (Gen.int_range 0 9) gen` | `lists gen ~max_size:9 ()` |
| `Gen.array gen` | `lists gen ()` then convert, or `map Array.of_list (lists gen ())` |
| `Gen.opt gen` | `optional gen` |
| `Gen.pair g1 g2` | `tuples2 g1 g2` |
| `Gen.triple g1 g2 g3` | `tuples3 g1 g2 g3` |
| `Gen.quad g1 g2 g3 g4` | `tuples4 g1 g2 g3 g4` |
| `Gen.oneof [g1; g2]` | `one_of [g1; g2]` (printable) or `sampled_from` for plain value lists |
| `Gen.oneofl [v1; v2]` | `sampled_from [v1; v2]` |
| `Gen.pure value` / `Gen.return value` | `just value` |
| `Gen.map f gen` | `map f gen` |
| `Gen.bind gen f` | `flat_map f gen`, or rewrite as sequential draws inside `composite` |
| `Gen.filter pred gen` | `filter pred gen` |

### Arbitrary (`QCheck2.Test.make`'s first argument) vs. Hegel

QCheck2 threads an `arbitrary` (a `Gen.t` optionally paired with a shrinker and printer) through `Test.make`. Hegel has no separate shrinker to write — shrinking is automatic — and a generator's printer is attached with `with_printer`, needed only to make an otherwise-`unprintable` generator drawable with `draw`:

```ocaml
(* QCheck2 *)
let point_arb =
  QCheck2.Gen.(pair (float_bound_inclusive 100.) (float_bound_inclusive 100.))
  |> QCheck2.make ~print:(fun (x, y) -> Printf.sprintf "(%f, %f)" x y)

(* Hegel *)
let point_gen =
  composite (fun tc ->
    let x = draw_silent tc (floats ~min_value:0.0 ~max_value:100.0 ()) in
    let y = draw_silent tc (floats ~min_value:0.0 ~max_value:100.0 ()) in
    x, y)
(* composite's result is unprintable; draw it with draw_silent, or attach
   a printer with with_printer if you want it to show in a draw's replay output *)
```

### Assertions

| QCheck2 | Hegel |
|---------|-------|
| property returns `true` | test body reaches its end without raising |
| property returns `false` | `assert false`, or `require tc false` |
| `QCheck2.assume cond` | `assume tc cond` |
| manual `if not (a = b) then ... print diff ...` | `require_equal tc sexp_of a b` (structural diff built in) |

### Configuration

| QCheck2 | Hegel |
|---------|-------|
| `Test.make ~count:500 ...` | `[@@settings Hegel.settings ~test_cases:500 ()]`, or `with_test_cases 500` |
| `Test.make ~long_factor:n ...` | No direct equivalent — set `~test_cases` explicitly |
| `QCHECK_SEED` env var | `with_seed (Some n)`, or `[@@settings ... |> with_seed (Some n)]` |
| shrinking is automatic per-arbitrary via `Shrink` | shrinking is automatic, engine-side, no per-generator code |

### Stateful / Model-Based Testing

QCheck's `STM` (`qcheck-stm`) functor-based state machine testing maps onto Hegel's `Stateful` module:

| QCheck STM | Hegel `Stateful` |
|------------|------------------|
| `type cmd` variant listing every command | Not needed — each rule is its own function |
| `type state` (model) | the `'state` type threaded through `Stateful.run` |
| `arb_cmd state` (command generator, depends on state) | draws inside a `Rule.create ~step` function, which receives the current state directly |
| `next_state cmd state` (model transition) | the `step` function's return value *is* the new state |
| `precond cmd state` | `assume tc (...)` inside `step`, checking `state` before drawing/acting |
| `run cmd sut` (apply to system under test) | perform the real-world side effect inside `step`, alongside updating the model |
| `postcond cmd state res` | an `invariants` function passed to `Stateful.run`, or an assertion inside `step` right after the side effect |

```ocaml
(* Hegel: an allocator with alloc/free rules and a size invariant *)
type state = { live : Int.Set.t; handles : int Stateful.Pool.t }

let alloc =
  Stateful.Rule.create ~name:"alloc" ~step:(fun _tc state ->
    let h = fresh_handle () in
    Stateful.Pool.add state.handles h;
    { state with live = Set.add state.live h })

let free =
  Stateful.Rule.create ~name:"free" ~step:(fun tc state ->
    let h = draw_silent tc (Stateful.Pool.values_consumed state.handles) in
    release h;
    { state with live = Set.remove state.live h })

let%hegel_test test_allocator tc =
  Stateful.run
    ~init:{ live = Int.Set.empty; handles = Stateful.Pool.create tc }
    ~rules:[ alloc; free ]
    ~invariants:[ (fun state -> assert (Set.length state.live < 10_000)) ]
    tc
```

QCheck's `cmd` pool for referencing previously created resources (often hand-rolled with an association list or `Hashtbl`) maps directly onto `Stateful.Pool` — see the reference's Stateful Testing section for `Pool.add`/`values_reusable`/`values_consumed`.

## From `Base_quickcheck` / `ppx_quickcheck`

`Base_quickcheck` derives a `Quickcheck.Generator.t` per type via `[@@deriving quickcheck]`, similar in spirit to hegel's own type-driven generation approach — but hegel-ocaml has no `[@@deriving hegel_generator]` deriver yet, so build a `composite` by hand for each record/variant type instead of expecting an automatic derivation.

| Base_quickcheck | Hegel |
|------------------|-------|
| `[@@deriving quickcheck]` on a record | hand-written `composite` drawing each field with `draw_silent` |
| `Quickcheck.Generator.map` | `map` |
| `Quickcheck.Generator.bind` / `>>=` | `flat_map`, or sequential draws inside `composite` |
| `Quickcheck.Generator.filter` | `filter` |
| `[%quickcheck.test]` | `let%hegel_test` |
| shrinker derived alongside the generator | automatic, no shrinker to write |

## Porting Checklist

When porting tests from QCheck(2) or Base_quickcheck:

1. **Remove the old dependency** from `dune`/`dune-project` (if no other tests use it) and add `hegel` plus `ppx_hegel_test` to the preprocessing pipeline.
2. **Replace `Test.make`/`[%quickcheck.test]`** with `let%hegel_test`.
3. **Convert `Gen.t`/`Quickcheck.Generator.t` values to `draw tc gen` calls.** Start with the broadest generators — don't carry over narrow `int_range`/`small_int` bounds from the old framework unless justified by the function's contract.
4. **Replace bool-returning properties** with `assert`, or `require`/`require_equal` where a structured diff is useful.
5. **Replace `QCheck2.assume`** with `assume tc`.
6. **Simplify dependent generation.** If the old test used `Gen.bind`/`>>=` chains just to make later values depend on earlier ones, rewrite as sequential draws inside a `composite`, or plain sequential `draw` calls in the test body.
7. **Remove custom shrinkers.** Hegel handles shrinking automatically, server-side.
8. **Port STM state machines to `Stateful.Rule`/`Stateful.Pool`/`Stateful.run`** per the mapping table above.
9. **Run the tests.** If they fail on inputs the old framework didn't find, investigate — that's the point.
