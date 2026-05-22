---
name: elixir
description: >
  Elixir/BEAM idioms, OTP design, and library conventions. Use when writing or
  reviewing Elixir code, or when the user mentions Phoenix, LiveView, OTP,
  GenServer, supervision trees, Ecto, raw SQL, SQLite, Broadway, Nerves, Nx,
  ExUnit, StreamData, hot code reloading, or BEAM concurrency. Also trigger
  when designing state machines, session runners, data pipelines, embedded
  systems, or ML pipelines in Elixir.
---

## Philosophy

The BEAM is not a language runtime — it is an operating system for concurrent,
fault-tolerant processes. Design with that in mind.

- Processes are the unit of isolation, not modules or functions.
- "Let it crash" is a design principle, not an excuse. Crashes are expected,
  supervised, and recoverable. Put error handling at supervision boundaries,
  not inside business logic.
- Model state explicitly. A process that holds state is a state machine —
  treat it as one.

## OTP and process design

- Use `GenServer` for stateful processes. Keep the callback module thin —
  delegate to pure functions in a separate module that the GenServer calls.
  This makes the business logic testable without starting a process.
- Use `Supervisor` with explicit restart strategies. `:one_for_one` is not
  always right — reason about failure propagation.
- Use `Registry` for named process lookup. Avoid module-level process naming
  via atoms except for singletons that genuinely exist once per node.
- Use `Task` for fire-and-forget or await-style concurrency within a
  supervised context. Prefer `Task.Supervisor` over bare `Task.async` in
  production code.
- Use `Agent` only for trivial shared state where a full GenServer would be
  noise. If you find yourself adding logic to an Agent, convert it.
- Define state as a struct with typed fields. Use `@type t :: %__MODULE__{}`.
  Never use bare maps as process state.

## State machines

When a process has a lifecycle, encode it. Two approaches:

- **`:gen_statem` / `GenStateMachine`** — for complex state machines with
  many states and transitions. Transitions are explicit and compiler-visible.
- **Pattern-matched `handle_*` with a `state` field** — for simpler cases.
  Use a sum type (atom or tagged tuple) for the state field; match exhaustively.

Do not guard transitions with `if` statements inside a single clause. Each
state should have its own clause or its own `handle_*` function.

## Error handling

- Use `{:ok, value} | {:error, reason}` tuples for expected failures.
- Chain with `with` — do not unwrap and rewrap manually.
- Error reasons should be atoms or tagged tuples with named structure,
  not strings.
- Use exceptions only for truly unexpected failures (programmer errors,
  violated invariants). `raise` is not control flow.
- At supervision boundaries, let the process crash and restart rather than
  catching every error internally.

## Phoenix and LiveView

- LiveView is a stateful process. Its `socket.assigns` is the process state —
  treat it as such. Model it as a struct where possible with `assign/2`.
- Keep `handle_event/3` thin. Extract domain logic into pure functions or
  context modules. LiveView callbacks are plumbing, not business logic.
- Use `Phoenix.PubSub` for cross-process communication in LiveView — not
  direct process messaging.
- Streams (`stream/4`, `stream_insert/4`) for large or frequently-updated
  lists — do not assign entire lists to socket if only diffs are needed.
- Use `phx-hook` sparingly. Prefer server-side state. When you must use JS
  interop, keep the hook minimal and push state back via events.
- Contexts are the boundary between Phoenix and your domain. They should
  expose functions that return `{:ok, t} | {:error, reason}`, not raw
  changesets to the controller/LiveView layer.

## Database — Ecto vs raw SQL

Choose based on the complexity and nature of the query:

**Use Ecto when:**

- Standard CRUD with simple associations
- You want compile-time guarantees on schema shape
- Changesets and validation are needed (forms, user input)
- Multi-tenancy or dynamic query composition is required

**Use raw SQL when:**

- Complex analytical queries where Ecto DSL becomes unreadable
- SQLite-specific features (e.g. `WITH RECURSIVE`, `json_each`, window
  functions) that Ecto does not model well
- Performance-critical paths where you want explicit control over the query
- You are building a library or tool that wraps the DB directly (`Kryp`-style)

For raw SQL, use `Ecto.Adapters.SQL.query/3` or `Exqlite` directly. Wrap
queries in named functions with clear specs. Never interpolate user input —
always use parameterised queries.

For SQLite specifically: use WAL mode, set `PRAGMA journal_mode=WAL` and
`PRAGMA synchronous=NORMAL` at connection time. Use a single writer process
if write contention is a concern.

## Broadway and data pipelines

- Broadway is for multi-stage, backpressure-aware pipelines with
  acknowledgement semantics. Use it when consuming from a queue (SQS, RabbitMQ,
  Kafka) or processing a high-volume event stream.
- For simpler pipelines (batch jobs, periodic processing), prefer
  `GenStage` directly or a supervised `Task` tree.
- Define `handle_message/3` and `handle_batch/4` as pure transformations.
  Side effects (DB writes, HTTP calls) go in batchers, not processors.
- Always handle failures explicitly — Broadway's acknowledgement model means
  unacknowledged messages will be redelivered.

## Nerves

- Nerves targets are first-class OTP releases. Everything you know about
  supervision and fault tolerance applies.
- Keep business logic in pure Elixir libraries that can be tested on the
  host. The Nerves-specific layer is the boundary — hardware drivers,
  GPIO, network configuration.
- Use `Circuits.GPIO` and `Circuits.I2C` for hardware interaction. Wrap
  them behind a behaviour so you can swap in a mock on the host.
- `Shoehorn` for early boot initialisation before the main application
  supervisor starts.
- Target firmware updates via `NervesHub` or `fwup` — never SSH into
  production devices for code changes.
- Test with `Mox` against the hardware behaviour mock. Real hardware tests
  are integration tests, not unit tests.

## Nx and ML

- `Nx` tensors are immutable values. Treat them like any other functional
  data — compose transformations, do not mutate.
- Use `defn` for numerical kernels — it JIT-compiles via EXLA or TorchScript.
  Keep `defn` functions pure and free of side effects.
- `Axon` for neural network definitions. Model is a data structure —
  training loop is separate.
- For inference in a LiveView or GenServer, run `Nx` operations in a
  dedicated process or `Task` to avoid blocking the BEAM scheduler.
- `Explorer` for dataframe-style operations. Prefer it over rolling your
  own list/map pipelines for tabular data.

## Macros and metaprogramming

- Prefer functions over macros. Macros are for DSL construction and
  compile-time code generation — not convenience wrappers around runtime logic.
  If a macro could be a function, it should be a function.
- `use MyModule` should do one thing: inject a `__using__` macro that sets up
  boilerplate (behaviour adoption, imports, aliases). Document exactly what it
  injects — `use` is invisible magic from the caller's perspective.
- Keep `quote/unquote` blocks minimal. Extract runtime logic into functions
  that the quoted code calls. Test the generated behaviour, not the macro
  mechanics.
- Avoid macros that hide control flow. If reading a call site does not make
  it clear what happens at runtime, the macro is doing too much.
- Use `@before_compile` and `@after_compile` hooks for compile-time validation
  — e.g. asserting that required callbacks are implemented, or generating
  functions from module attributes accumulated with `@attr value`.
- Metaprogramming is a library author tool, not an application tool. In
  application code, macros are almost always a sign that the abstraction is
  at the wrong level.

**Protocols vs behaviours:**

- Use a `behaviour` when you control the implementations and want a compile-time
  contract (Dialyzer checks, `@callback` specs, `Mox` support).
- Use a `Protocol` when implementations will be provided by third parties or
  applied to types you do not own (e.g. making your struct work with `Inspect`,
  `Enumerable`, `Jason.Encoder`).
- Do not define a Protocol when a behaviour would do — Protocols have runtime
  dispatch overhead and are harder to mock.

## Testing

- `ExUnit` for unit and integration tests.
- `StreamData` (property-based) for pure functions — prefer it over
  example-based tests for data transformation logic.
- `Mox` for mocking behaviours. Define behaviours for all external
  dependencies (HTTP clients, hardware drivers, external APIs).
- Use `Ecto.Adapters.SQL.Sandbox` for database tests — each test runs in
  a transaction that is rolled back. Set `async: true` where safe.
- Test GenServers via their public API, not by inspecting internal state.
  Use `GenServer.call/2` and assert on return values or side effects.
- Never skip tests. If a test is hard to write, the interface is probably
  wrong.

## Naming and style

- Module names reflect domain concepts, not technical roles. `Burpee.Session`
  not `Burpee.SessionManager`.
- Use `@spec` and `@type` on all public functions. Dialyzer is not optional.
- Pipelines (`|>`) for data transformation. Avoid deeply nested pipelines
  that mix concerns — break into named steps.
- Avoid `Enum` where `Stream` suffices for large or lazy collections.
- Private functions are `defp`. If a function is only used in tests, reconsider
  the design — test the public interface.

## What to avoid

- `Process.send_after/3` for business logic timing — use `GenServer`
  timeouts or a dedicated scheduler process.
- `:timer.sleep/1` in production code.
- `send/2` to PIDs you do not own — use `GenServer.call/cast` or PubSub.
- String-based error reasons.
- Large message passing between processes — share references or use ETS
  for large shared state.
- `IO.inspect/2` left in committed code — use `Logger`.
- Atoms from user input without a whitelist — the atom table is not GC'd.
