# Bleeding-edge Bonsai reference

## Scope and evidence

Target upstream `master`, not the latest opam release. Interfaces take precedence
when prose and examples disagree. Recheck live sources before implementation;
these are inspected snapshots, not a compatibility guarantee across future heads:

| Repository | Inspected commit |
|---|---|
| `janestreet/bonsai` | `f31661450eb133fe89564219d97669c2735c6622` |
| `janestreet/bonsai_web` | `989c18b5381cad767365923d4f0b758c6f3c602c` |
| `janestreet/bonsai_web_test` | `1f93af9d1c2bbad677db6f9c27ec450c66679c9f` |
| `janestreet/bonsai_examples` | `1038b46e9d00fbeda3316a089f874857287e64b6` |

Primary sources:

- [Core API: cont.mli](https://github.com/janestreet/bonsai/blob/f31661450eb133fe89564219d97669c2735c6622/src/cont.mli)
- [Core entry point and API generations](https://github.com/janestreet/bonsai/blob/f31661450eb133fe89564219d97669c2735c6622/src/bonsai.mli)
- [Web entry point and Start](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/web/bonsai_web.mli)
- [Quick start](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/quick_start.md)
- [Local graph migration](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/upgrade/local-graph.md)
- [Pitfalls and performance](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/how_to/best_practices_pitfalls.md)

For newer heads, replace the commit in these URLs with `master`, inspect the
actual interfaces, then record the revisions used in the implementation report.

## Compiler and build boundary

The README contains OxCaml `(graph @ local)` syntax, while older web docs use
`(local_ graph)`. Exported `.mli` signatures and examples also use plain `graph`.
These are not interchangeable syntax on every compiler. Match the project's
compiler and PPX version; preserve the graph construction/runtime boundary even
when locality annotations are absent from exported types.

The inspected package metadata declares OCaml >= 5.1 and Dune >= 3.17;
`bonsai_web` also declares `js_of_ocaml` and `js_of_ocaml-ppx` >= 6.0.
These lower bounds do not establish that all bleeding-edge packages, README
syntax, or internal build examples work together. Inspect the lockfile/switch
and resolve a consistent dependency set. Do not invent an opam pin recipe.

A [current example Dune stanza](https://github.com/janestreet/bonsai_examples/blob/1038b46e9d00fbeda3316a089f874857287e64b6/counters_open_source/dune)
uses libraries `bonsai_web core` and preprocessors
`bonsai.ppx_bonsai ppx_jane`. Its `(modes byte exe)` stanza alone does not
explain how the app's JavaScript bundle is built. Follow the target repository's
Js_of_ocaml targets and host HTML. Add `ppx_html`/`ppx_css` only when those syntaxes
are used and supported by its build setup.

Sources: [bonsai.opam](https://github.com/janestreet/bonsai/blob/f31661450eb133fe89564219d97669c2735c6622/bonsai.opam),
[bonsai_web.opam](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/bonsai_web.opam).

## Values, graph, and composition

- `'a Bonsai.t` is an incrementally changing value, not an effect or a promise.
- `Bonsai.graph` authorizes building stateful structure. Build components before
  entering reactive callbacks. Do not capture it in an event handler, `Effect`
  chain, or the recomputing body of `let%arr`.
- A typical component has shape
  `'input Bonsai.t -> Bonsai.graph -> 'output Bonsai.t`.
  Returning records/tuples of separate reactive values is also supported.
- `let%arr` derives ordinary OCaml output from reactive inputs. It is preferred
  over `let%map`, particularly when destructuring and ignoring fields, because
  the PPX can avoid updates driven by unused fields.
- `let%sub` is generally unnecessary for component calls in Cont: use ordinary
  function application with `graph`. **`match%sub` remains useful** for selecting
  stateful branches. Put it inside a function accepting `graph`, not at top level.
- Use ordinary `Map.map`/`List.map` for pure rendering/transforms. Use `assoc`
  when each key needs graph-backed behavior; it has overhead.

## State and actions

Selected signatures below omit optional source-position/debug/reset parameters:

```ocaml
Bonsai.state :
  'model -> Bonsai.graph ->
  'model Bonsai.t * ('model -> unit Effect.t) Bonsai.t

Bonsai.state_machine :
  default_model:'model ->
  apply_action:(('action, unit) Bonsai.Apply_action_context.t ->
                'model -> 'action -> 'model) ->
  Bonsai.graph ->
  'model Bonsai.t * ('action -> unit Effect.t) Bonsai.t
```

`state` overwrites a model; `state_machine` applies an action to the current
model. Use domain-specific action variants when transitions become nontrivial.
Keep models immutable and pass suitable equality/sexp functions where useful.

`state_machine_with_input` additionally takes an `'input Bonsai.t`; its
`apply_action` receives `'input Bonsai.Computation_status.t` before the model
and action. Handle both `Active input` and `Inactive` explicitly. Do not read
reactive input by allocating graph nodes inside an action handler.

Effects needed by a transition can be scheduled through
`Bonsai.Apply_action_context.schedule_event ctx effect`. Keep ordinary I/O out
of model calculations and reactive mapping.

## Dynamic collections and state ownership

```ocaml
let row_views rows graph =
  Bonsai.assoc (module Row_id) rows
    ~f:(fun row_id row graph -> row_component row_id row graph)
    graph
```

Here `Row_id` supplies the comparator, `rows` is a reactive map, and the callback
receives **reactive key, reactive data, graph**. `Row_id` and `row_component`
are application-defined. The result is a reactive map of component results.

Use stable domain IDs, not display positions. Each key owns independent state.
A removed key becomes inactive, but its state is retained and is available when
that key returns. `match%sub` likewise retains inactive branch state.
Deactivation is not unmount-and-forget. Use `Bonsai.with_model_resetter` or
appropriate component reset behavior when the product needs a fresh model.

For exactly one active identity with independent remembered state, use:

```ocaml
Bonsai.scope_model (module User_id) ~on:selected_user
  ~for_:(fun graph -> editor graph) graph
```

Source: [lifecycles](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/how_to/lifecycles.md)
and [state per key](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/how_to/state_per_key.md).

## Effects and freshness

`'a Effect.t` describes scheduled work producing an `'a`. Returning one from
`Vdom.Attr.on_click` lets the Bonsai runtime execute it. Constructing or dropping
an effect does not perform that work. This is a library effect abstraction,
not OCaml 5 algebraic effects; generic advice to replace monads with Eio does
not apply to Bonsai's browser runtime.

`let%bind.Effect () = set_state next in ...` sequences effects, but cannot
refresh an ordinary value already captured by a closure. Allocate a sampler
while building the graph, then bind it after the setter:

```ocaml
let set_and_read derived set_state graph =
  let peek_derived = Bonsai.peek derived graph in
  let%arr peek_derived and set_state in
  fun next ->
    let%bind.Effect () = set_state next in
    match%bind.Effect peek_derived with
    | Active value -> Effect.alert value
    | Inactive -> Effect.Ignore
;;
```

This example expects `derived : string Bonsai.t` and a reactive setter, with
`Core`, `Bonsai_web`, and `Bonsai.Let_syntax` opened as in the main skill.
`peek` has the simplified type:

```ocaml
'a Bonsai.t -> Bonsai.graph ->
'a Bonsai.Computation_status.t Effect.t Bonsai.t
```

The sampler reads updated incremental data when bound inside the effect chain;
this does not promise that an outstanding RPC or other asynchronous work has
finished. Handle inactive data rather than assuming it remains readable.

Use `Bonsai.Edge.on_change ~equal value ~callback graph` when the behavior really
is driven by changes, including its initial activation. The callback itself is
reactive: `('a -> unit Effect.t) Bonsai.t`. This is not a replacement for every
setter-then-read operation: unchanged values will not cause another change event.
`Edge.lifecycle` handles activation/deactivation; `after_display` runs every
active frame, so it is not a default polling mechanism.

Source: [effects and stale values](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/how_to/effects_and_stale_values.md).

## Testing without a browser

Use `Bonsai_web_test.Handle`, not Proc-era component types. The following is an
interaction **sequence**, to embed in an expect test with actual captured
snapshots rather than guessed expected HTML:

```ocaml
let handle =
  Bonsai_web_test.Handle.create
    (Bonsai_web_test.Result_spec.vdom Fn.id) counter
in
Bonsai_web_test.Handle.show handle;
Bonsai_web_test.Handle.click_on handle ~get_vdom:Fn.id ~selector:"button";
Bonsai_web_test.Handle.show handle
```

The counter is the component in the main skill. Verify the initial text is `0`
and the post-click text is `1`. A bare `button` selector is adequate only for
this one-button example. For application tests prefer `Bonsai_web.Test_selector`:
create one with `Test_selector.make ()`, attach it via `Test_selector.attr`, and
pass `Bonsai_web_test.test_selector selector` to `~selector`.

- `Handle.show` recomputes one frame and prints the result; `recompute_view`
  advances a frame without printing. Use `show_diff` for focused changes.
- Test input changes with `Bonsai.Expert.Var`; keep local app state in state
  primitives. Test deactivate/reactivate and reset semantics for keyed state.
- Use controlled clocks and mock RPC implementations, not sleeps. Inspect
  `Bonsai_web_test_async` for tests requiring Async.
- Wire inline expect tests into the project's **JavaScript/Node** test runner,
  not an ordinary native-only test stanza. The upstream testing guide contains
  internal Jenga syntax: do not paste it as portable modern Dune configuration.
- Vdom tests are not browser layout tests. Events do not propagate, and the
  documented harness does not execute Vdom hooks/widgets; use browser tests for
  actual focus, layout, listeners, and browser-specific integrations.

Sources: [testing guide](https://github.com/janestreet/bonsai_web/blob/989c18b5381cad767365923d4f0b758c6f3c602c/docs/how_to/testing.md),
[current Handle and Result_spec interface](https://github.com/janestreet/bonsai_web_test/blob/1f93af9d1c2bbad677db6f9c27ec450c66679c9f/proc.mli).
Despite the latter filename, the exported `Handle.create` accepts
`Bonsai.graph -> 'a Bonsai.t`.

## Performance and adjacent APIs

Keep expensive pure transforms separate from view construction. Choose
`Bonsai.cutoff ~equal` only where equivalence is valid for every downstream
consumer; an over-broad equality silently suppresses needed updates. Prefer
`Clock.approx_now` at a suitable cadence over `Clock.Expert.now` when per-frame
time is unnecessary. For large keyed DOM collections, inspect
`Vdom.Node.Map_children` and the target version's API.

For forms, RPCs, tables, theming, browser APIs, and URL state, start at the
[how-to index](https://github.com/janestreet/bonsai_web/tree/master/docs/how_to)
and inspect the corresponding library interfaces. Do not extrapolate their
signatures from old tutorials. Keep [bonsai_examples](https://github.com/janestreet/bonsai_examples)
as a source of working patterns, checking that each example uses the intended
API generation and build toolchain.
