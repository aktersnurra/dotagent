# Hegel OCaml Reference

## Table of Contents

- [Setup](#setup)
- [Test Structure](#test-structure) — `let%hegel_test`, `run_hegel_test`, Settings
- [Drawing Values](#drawing-values) — `draw`, `draw_silent`, `with_printer`
- [Guiding Generation](#guiding-generation) — `assume`, `target`
- [Debugging Tests](#debugging-tests) — `note`, `require`, `require_equal`
- [Generator Reference](#generator-reference) — Primitives, collections, tuples,
  functions, format generators, regex
- [Generator Combinators](#generator-combinators) — `composite`, `map`, `flat_map`,
  `filter`
- [Concurrency and Parallelism](#concurrency-and-parallelism) — `clone`, `spawn`/`join`,
  Threads, Domainslib, Eio
- [OCaml-Specific Examples](#ocaml-specific-examples)
- [Gotchas](#gotchas)
- [Stateful Testing](#stateful-testing) — `Stateful.Rule`, `Stateful.Pool`,
  `Stateful.run`

## Setup

```bash
opam install hegel
```

To pin the latest development version from GitHub instead:

```bash
opam pin add hegel "git+https://github.com/hegeldev/hegel-ocaml.git"
```

Hegel for OCaml supports **Linux** (amd64/arm64) and **macOS** (Apple Silicon). macOS
amd64 (Intel) has no published `libhegel` artifact — point `HEGEL_LIBHEGEL_PATH` at a
locally built `libhegel.dylib` on that platform.

Add `hegel` to your dune library dependencies:

```dune
(library
 (name my_tests)
 (libraries hegel)
 (inline_tests (backend ppx_hegel_test))
 (preprocess (pps ppx_hegel_test)))
```

`ppx_hegel_test` is not required, but is strongly recommended: it integrates with
`dune runtest` and supplies binding names as draw labels for free (see
[Drawing Values](#drawing-values)). Run tests with `dune runtest`.

## Test Structure

### `let%hegel_test` (preferred)

```ocaml
open Hegel
open Hegel.Generators

let%hegel_test commutative_addition tc =
  let a = draw tc (integers ~min_value:(-1000) ~max_value:1000 ()) in
  let b = draw tc (integers ~min_value:(-1000) ~max_value:1000 ()) in
  require_equal tc Core.Int.sexp_of_t (a + b) (b + a)
```

`let%hegel_test name tc = body` defines `name` as a plain `unit -> unit` function
(callable directly, e.g. from Alcotest) and registers it with `dune runtest`.

With configuration, attach a `[@@settings ...]` attribute:

```ocaml
let%hegel_test commutative_addition tc =
  let a = draw tc (integers ()) in
  let b = draw tc (integers ()) in
  require_equal tc Core.Int.sexp_of_t (a + b) (b + a)
[@@settings Hegel.settings ~test_cases:500 () |> with_seed (Some 5) |> with_verbosity Verbose]
```

### `run_hegel_test` (direct call)

Call `run_hegel_test` directly to drive a property from a plain executable or another
test harness:

```ocaml
let my_settings = Hegel.settings ~test_cases:50 ~seed:5 () in
let () =
  Hegel.run_hegel_test ~settings:my_settings (fun tc ->
    let n = draw tc (integers ~min_value:0 ~max_value:9 ()) in
    assert (n >= 0 && n <= 9))
```

### Settings

Build a `settings` value with `default_settings` or `settings`, refine it with the
`with_*` functions:

| Function                              | Purpose                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `default_settings ()`                 | Defaults, auto-detecting CI (derandomized, database disabled in CI)       |
| `settings ?test_cases ?seed ()`       | Convenience constructor for common overrides                              |
| `with_test_cases n s`                 | Number of test cases to run (default 100)                                 |
| `with_stateful_step_count n s`        | Max steps per stateful test                                               |
| `with_verbosity v s`                  | `Quiet` \| `Normal` \| `Verbose` \| `Debug`                               |
| `with_seed seed s`                    | Fixed seed (`int option`)                                                 |
| `with_derandomize b s`                | Derive seed from test identity instead of fresh randomness                |
| `with_database db s`                  | `Unset` \| `Disabled` \| `Path of string` — where failures persist/replay |
| `with_suppress_health_check checks s` | Disable specific `health_check` variants                                  |
| `with_phases phases s`                | Restrict to a `phase list` (`Reuse`, `Generate`, `Target`, `Shrink`)      |
| `with_mode mode s`                    | `Test_run` (default) or `Single_test_case`                                |
| `with_print_blob b s`                 | Toggle the `rerun with:` replay line (on by default)                      |
| `with_report_multiple_failures b s`   | Report every distinct failure, not just the first                         |

`health_check` variants: `Filter_too_much`, `Too_slow`, `Test_cases_too_large`,
`Large_initial_test_case`.

In CI (detected automatically), `derandomize` is `true` and `database` is `Disabled`.

## Drawing Values

| Function       | Signature                                                                | Purpose                                                   |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `draw`         | `?label:string -> test_case -> ('a, printable) generator -> 'a`          | Draw a value; shown in counterexample output              |
| `draw_silent`  | `test_case -> ('a, 'p) generator -> 'a`                                  | Draw without recording (works on unprintable generators)  |
| `with_printer` | `('a -> Core.Sexp.t) -> ('a, 'p) generator -> ('a, printable) generator` | Attach a printer, making a generator drawable with `draw` |

Every generator carries a phantom type: `printable` (has a printer, drawable with
`draw`) or `unprintable` (drawable only with `draw_silent`, or promote it with
`with_printer`). Primitives (`integers`, `booleans`, `text`, …) are printable; `map`,
`flat_map`, `sampled_from`, `just`, `composite`, and derived generators are unprintable
because their result type is the caller's, not the engine's.

Inside `let%hegel_test`, the PPX supplies the binding name as the draw label
automatically, so `let x = draw tc gen` prints `x = value` on a failing replay. A
shadowed or looped binding is numbered (`x_1`, `x_2`, …).

```ocaml
let%hegel_test with_printer_example tc =
  let doubled = map (fun x -> x * 2) (integers ~min_value:0 ~max_value:9 ()) in
  let n = draw tc (with_printer [%sexp_of: int] doubled) in
  assert (n >= 0)
```

## Guiding Generation

**`assume tc condition`** states a precondition. When `false`, the current test case is
discarded (not failed) and hegel generates another.

```ocaml
let%hegel_test head_cons_tail_reconstructs tc =
  let xs = draw tc (lists (integers ()) ()) in
  assume tc (xs <> []);
  assert (List.hd xs :: List.tl xs = xs)
```

Prefer constraining the generator (e.g. `~min_size:1`) over `assume` when the rejection
rate would be high — `assume` trips the `Filter_too_much` health check if it discards
too much.

**`target tc value label`** feeds a labeled observation to the engine, biasing search
toward higher values:

```ocaml
let%hegel_test grow_size tc =
  let v = draw tc (integers ~min_value:0 ~max_value:1000 ()) in
  target tc (float_of_int v) "size";
  assert (v <= 1000)
```

## Debugging Tests

**`note tc message`** prints subject to verbosity: never under `Quiet`, only on the
final failing replay under `Normal`, every case under `Verbose`/`Debug`.

**`require tc ?msg condition`** fails the case with `Failure msg` when `condition` is
`false`.

**`require_equal tc sexp_of lhs rhs`** fails when the two values render to different
sexps, and shows a structural diff in the failure report. Prefer this over
`assert (lhs = rhs)`, which reports only that the assertion failed:

```ocaml
let%hegel_test sort_is_stable tc =
  let l = draw tc (lists (integers ()) ()) in
  require_equal tc (Core.List.sexp_of_t Core.Int.sexp_of_t)
    (List.sort compare l) (stable_sort l)
```

A failing run prints a framed report: the shrunk counterexample's draws and notes, the
exception, and a copy-pasteable `rerun with:` line (base64-encoded choice sequence) that
can be pasted into a `[@@failure_blobs [...]]` attribute to replay the exact failure.

## Generator Reference

All generators live in `Hegel.Generators`. Examples assume `open Hegel` and
`open Hegel.Generators`.

### Primitive Generators

**`booleans ()`** → `(bool, printable) generator`

**`integers ?min_value ?max_value ()`** → `(int, printable) generator`. Defaults to
OCaml's native int min/max.

```ocaml
let n = draw tc (integers ~min_value:1 ~max_value:6 ())
```

**`floats ?min_value ?max_value ?exclude_min ?exclude_max ?allow_nan ?allow_infinity ()`**
→ `(float, printable) generator`. `allow_nan`/`allow_infinity` default to `true` only
when unbounded (or, for infinity, when at most one bound is set).

**`text ?min_size ?max_size ?codec ?min_codepoint ?max_codepoint ?categories ?exclude_categories ?include_characters ?exclude_characters ?alphabet ()`**
→ `(string, printable) generator`. Unicode text; `codec` restricts to an encoding
(`"ascii"`, `"utf-8"`, `"latin-1"`), `categories`/`exclude_categories` filter by Unicode
general category (mutually exclusive), `alphabet` fixes the exact character set
(mutually exclusive with the other filters). Surrogate codepoints are always excluded.

**`characters ...`** → same filtering options as `text` minus
`min_size`/`max_size`/`alphabet`; produces single-character strings.

**`binary ?min_size ?max_size ()`** → `(string, printable) generator` of binary byte
strings.

**`just value`** → `('a, unprintable) generator` that always produces `value`.

### Collection Generators

**`lists elements ?min_size ?max_size ?unique ()`** → `('a list, printable) generator`.

```ocaml
let xs = draw tc (lists (integers ~min_value:0 ~max_value:9 ()) ~max_size:10 ())
```

**`assoc_lists keys values ?min_size ?max_size ()`** →
`(('a * 'b) list, printable) generator` of `(key, value)` pairs with unique keys, in
generation order.

**`hash_tables keys values ?min_size ?max_size ()`** →
`(('a, 'b) Core.Hashtbl.t, printable) generator`, entries generated like `assoc_lists`.

**`sampled_from options`** → `('a, unprintable) generator` sampling from a non-empty
list. Sampling is _not_ uniform — boundary indices (especially the first) are
over-weighted, matching sibling Hegel clients.

**`one_of generators`** → `('a, printable) generator` picking among printable generators
(at least one required). The printed value uses the printer of whichever branch produced
it.

**`optional gen`** → `('a option, printable) generator`, `None` or `Some value`.

### Tuple Generators

`tuples2`, `tuples3`, `tuples4` combine 2–4 printable generators into a printable tuple
generator:

```ocaml
let a, b, c =
  draw tc (tuples3 (integers ~min_value:0 ~max_value:9 ()) (booleans ()) (text ~max_size:4 ()))
```

### Function Generators

**`functions ?name ?sexp_of_arg ~returns ()`** → `('a -> 'b, unprintable) generator`.
Applying the drawn function memoizes results per argument (structural hash/equality).
Draw with `draw_silent`.

```ocaml
let%hegel_test map_length_preserved tc =
  let f_gen = functions ~sexp_of_arg:Core.Int.sexp_of_t ~returns:(integers ()) () in
  let f = draw_silent tc f_gen in
  let xs = draw tc (lists (integers ()) ()) in
  assert (List.length (List.map ~f xs) = List.length xs)
```

**`functions2`**, **`functions3`** — curried 2- and 3-argument variants; the argument
tuple forms one memo key.

### Format Generators

| Generator                  | Produces                                                        |
| -------------------------- | --------------------------------------------------------------- |
| `emails ()`                | RFC 5321/5322 email address strings                             |
| `urls ()`                  | RFC 3986 URL strings (`scheme://domain[:port]/path[#fragment]`) |
| `domains ?max_length ()`   | RFC 1035 domain names (`max_length` must be in `[4, 255]`)      |
| `dates ()`                 | `Core.Date.t`, year in `[1, 9999]`                              |
| `times ()`                 | `Core.Time_ns.Ofday.t`, microsecond precision                   |
| `datetimes ()`             | `(Core.Date.t * Core.Time_ns.Ofday.t)`                          |
| `ip_addresses ?version ()` | `Ipaddr.t`; `` `V4 `` / `` `V6 `` or either when omitted        |

### Regex Generator

**`from_regex pattern ?fullmatch ()`** → `(string, printable) generator` matching Python
`re`-syntax `pattern`. `fullmatch` (default `true`) requires the whole string to match.

```ocaml
let s = draw tc (from_regex "[a-z]+" ())
```

## Generator Combinators

### `composite`

Build a generator from imperative code that draws sub-values and assembles a result —
the idiomatic way to write custom generators in OCaml:

```ocaml
type person = { age : int; name : string }

let person =
  composite (fun tc ->
    let age = draw_silent tc (integers ()) in
    let name = draw_silent tc (text ()) in
    { age; name })
```

Draws inside `composite` can depend on earlier draws directly — no `flat_map` needed for
sequential dependent generation:

```ocaml
type person = { age : int; name : string; driving_license : bool }

let person =
  composite (fun tc ->
    let age = draw_silent tc (integers ()) in
    let name = draw_silent tc (text ()) in
    let driving_license =
      if age >= 18 then draw_silent tc (booleans ()) else false
    in
    { age; name; driving_license })
```

### `map f gen`

Transform values from `gen` using `f`. Result is unprintable.

### `flat_map f gen`

Dependent generation — `f` receives the drawn value and returns the generator to draw
the final result from. Prefer `composite` with sequential draws for most dependent
generation in OCaml; use `flat_map` when composing existing generator values point-free.

### `filter predicate gen`

Keeps `gen`'s printability. Retries up to 3 times, then rejects the test case
(`assume false`) if all attempts fail. Prefer bounds over filters when possible.

## Concurrency and Parallelism

A `test_case` handle must not be drawn from concurrently by more than one thread — give
each thread its own **clone**. A draw is a synchronous engine call that holds its
domain's runtime lock and does not yield.

**`clone tc`** creates an independent stream of the same test case.

**`spawn tc f`** clones `tc` and runs `f clone` on a new thread; **`join w`** awaits it
and re-raises any exception on the calling thread (unlike `Thread.join`, which drops
it).

```ocaml
let%hegel_test two_hands_two_dice tc =
  let die = integers ~min_value:1 ~max_value:6 () in
  let other_hand = spawn tc (fun worker -> draw_silent worker die) in
  let this_hand = draw_silent tc die in
  assert (this_hand + join other_hand >= 2)
```

Library-specific guidance:

- **Threads** — use for interleaving/overlapping blocking work, not parallel generation
  (draws serialize under the runtime lock). Use `spawn`/`join`, not raw
  `Thread.create`/`Thread.join`.
- **Domainslib** — use for real parallel generation throughput. Set up the domain pool
  once and reuse it; `clone` up front, then `Task.async`/`Task.await` each clone.
- **Eio** — use for structured concurrent generation. Each fiber draws from its own
  clone; only separate domains make draws truly parallel (a draw itself does not yield).

## OCaml-Specific Examples

These show OCaml-specific idioms. For general property patterns (round-trip,
model-based, idempotence, etc.), see the main skill's Property Catalogue.

### Dependent generation via `composite`

```ocaml
let%hegel_test test_valid_index tc =
  let v = draw tc (lists (integers ()) ~min_size:1 ()) in
  let idx = draw tc (integers ~min_value:0 ~max_value:(List.length v - 1) ()) in
  ignore (List.nth v idx)
```

### Custom record generator with field dependence

```ocaml
type config = { max_retries : int; timeout_ms : int; name : string }

let config_gen =
  composite (fun tc ->
    let max_retries = draw_silent tc (integers ~min_value:0 ~max_value:10 ()) in
    let timeout_ms = draw_silent tc (integers ~min_value:1 ~max_value:60_000 ()) in
    let name = draw_silent tc (text ~min_size:1 ()) in
    { max_retries; timeout_ms; name })

let%hegel_test config_merge_prefers_override tc =
  let base = draw_silent tc config_gen in
  let override = draw_silent tc config_gen in
  let merged = merge base override in
  require_equal tc [%sexp_of: string] merged.name override.name
```

## Gotchas

1. **Unprintable generators need `draw_silent` or `with_printer`.** `composite`, `map`,
   `flat_map`, `sampled_from`, and `just` all return `unprintable` generators — `draw`
   will not typecheck against them.

2. **Add `.hegel/` to `.gitignore`.** Hegel caches the server binary and stores the
   failure database there.

3. **`note` only prints on the final replay** (under `Normal` verbosity) — don't rely on
   it for progress logging.

4. **Float defaults include NaN and infinity.** Unbounded `floats ()` generates both by
   default; pass `~allow_nan:false` / `~allow_infinity:false` if the code under test
   can't handle them — but consider whether it should first.

5. **`assume`/`filter` rejecting too much fails the health check.** Restructure
   generators to produce valid inputs directly (e.g. via `composite`) rather than
   filtering.

6. **Default collection sizes are small.** Draw the size separately for large
   collections:

   ```ocaml
   let n = draw tc (integers ~min_value:0 ~max_value:300 ()) in
   let keys = draw tc (lists (integers ()) ~min_size:n ())
   ```

7. **Use `~unique:true` for map/set key generation** to avoid ambiguity about which
   value wins for duplicate keys.

8. **A `test_case` handle is not thread-safe.** Give each thread/fiber its own `clone`;
   drawing from one shared handle concurrently raises a concurrent-use error.

9. **Wrap arithmetic in test code to avoid unrelated overflow.** OCaml's native `int`
   doesn't trap on overflow the way some languages do, but derived computations (e.g.
   widening into a `Core.Int63` or external numeric type) can still misbehave — draw a
   narrower generator and widen explicitly if a computed value must stay in range.

## Stateful Testing

Hegel supports stateful (model-based) testing via `Stateful.Rule`, `Stateful.Pool`, and
`Stateful.run`.

### Defining and Running a State Machine

```ocaml
let push =
  Stateful.Rule.create ~name:"push" ~step:(fun tc stack ->
    let n = draw tc (integers ~min_value:0 ~max_value:100 ()) in
    n :: stack)

let pop =
  Stateful.Rule.create ~name:"pop" ~step:(fun tc stack ->
    assume tc (not (List.is_empty stack));
    List.tl stack)

let%hegel_test integer_stack tc =
  Stateful.run
    ~init:[]
    ~rules:[ push; pop ]
    ~sexp_of_state:(Core.List.sexp_of_t Core.Int.sexp_of_t)
    tc
```

- **`Stateful.Rule.create ~name ~step`** declares a rule. `step tc state` performs one
  application, drawing whatever it needs from `tc` and returning the new state. Use
  `assume tc` to skip a rule that doesn't apply (e.g. popping an empty stack).
- **`Stateful.run ~init ~rules ?invariants ?sexp_of_state tc`** repeatedly applies
  randomly chosen rules to state threaded from `init`, checking `invariants`
  (`'state -> unit` functions) before the first step and after every successful one.
  Raises `Invalid_argument` if `rules` is empty.
- Passing `?sexp_of_state` prints the model state after each step on a failing replay,
  alongside `Step N: <name>` for each applied rule and the values it drew.

### Pools (Dynamically Created Resources)

Use `Stateful.Pool` to let one rule's output feed a later rule's input — e.g. a handle
allocated by one rule and freed by another:

```ocaml
type state =
  { live : Int.Set.t
  ; handles : int Stateful.Pool.t
  }

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
```

`Stateful.Pool` operations:

| Function                    | Purpose                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `Pool.create tc`            | Empty pool tied to this test case — don't reuse across test cases                    |
| `Pool.add pool value`       | Record a value for later draws                                                       |
| `Pool.size pool`            | Number of values currently in the pool                                               |
| `Pool.values_reusable pool` | Unprintable generator drawing a value _without_ removing it; `assume false` if empty |
| `Pool.values_consumed pool` | Unprintable generator drawing _and removing_ a value; `assume false` if empty        |
