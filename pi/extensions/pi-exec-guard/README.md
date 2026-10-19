# Pi execution and network guard

Opt-in, pre-execution permission checks for Bash, code, web requests, and MCP tools.
Uses local hazard rules followed by TypeSafe **Jev 1.13** through OpenRouter's Decisions
API. Uses **Effect 3.22.3** for typed failures, cancellation/timeouts, and a shared
approval semaphore. Requires Pi **1.1.0+**.

**This is a best-effort guardrail, not a sandbox, firewall, or security boundary.**

## Install and enable

From the repository root:

```bash
./install-pi
```

The installer links this directory into the Pi extension directory and installs locked
runtime dependencies with lifecycle scripts disabled. It does **not** set credentials or
enable the guard. It refuses to overwrite another extension at the target path.

Supply `OPENROUTER_API_KEY` to the Pi process through your normal secret-management setup.
Then start a new Pi session:

```bash
PI_EXEC_GUARD=1 pi
```

Only the exact value `1` enables the guard. Configuration is captured when the extension
loads; there is no runtime bypass command. Missing credentials while enabled **block
covered calls**, rather than silently turning the guard off. Your selected chat and
subagent models are unchanged: Jev is an independent classifier.

To try it without installing the symlink:

```bash
npm ci --prefix pi/extensions/pi-exec-guard --ignore-scripts
PI_EXEC_GUARD=1 pi -e ./pi/extensions/pi-exec-guard/index.ts
```

Do not load the same extension twice. Starting Pi without `PI_EXEC_GUARD=1` leaves it
inactive: no event handlers or classifier requests are registered.

## What is covered

| Operations | Tool names |
| --- | --- |
| Agent execution | `bash`, `powershell`, `ctx_execute`, `ctx_execute_file`, `ctx_batch_execute`, `codemode` |
| Public web and network requests | `web_search`, `fetch_content`, `source_check`, `ctx_fetch_and_index` |
| MCP | `mcp` gateway and `mcp__…` tools |
| Batched tool calls | `multi_tool_use.parallel` / `parallel` |
| User shell commands | Pi's `!` and `!!` commands via `user_bash` |

Dotted names such as `functions.bash` are recognized. Tool annotations declaring
`openWorldHint: true` or `destructiveHint: true` broaden coverage; read-only hints do
not exempt an explicitly covered tool. Nested calls made through Pi's `ctx.executeTool`
pass through the hook too. Whole batch inputs are assessed, not just their first entry.
Opaque or unknown nested tools require permission. Known-tool rules also apply to
standard `mcp__server__tool` identities and MCP gateway calls, including object or
JSON-string `args`. Malformed or uninspectable wrapped arguments require permission;
wrapping file execution does not bypass its mandatory local approval.

Add tools with other names explicitly:

```bash
PI_EXEC_GUARD=1 PI_EXEC_GUARD_TOOLS='shell_execute,my_remote_tool' pi
```

Additional names are comma-separated exact tool identifiers. Review your installed
extensions' tool names: arbitrary new execution/network tools are **not automatically
recognized** unless their annotations or configured names cover them. Ordinary
`read`, `edit`, and `write` calls are out of scope unless explicitly added/annotated.

## OpenRouter app attribution

Every classifier request identifies the app as **Pi Exec Guard** using
`X-OpenRouter-Title` and the repository URL
`https://github.com/aktersnurra/dotagent` as `HTTP-Referer`. This associates usage with
the app in OpenRouter analytics. Requests also send
`X-OpenRouter-App-Visibility: hidden` to avoid creating a public listing; that header
only controls newly created apps and does not change an existing app's visibility.

## Decisions and approval

1. Validate and snapshot the complete input (maximum **24 KiB UTF-8 JSON**).
2. Local rules flag obvious hazards: privileged or destructive commands, uploads/remote
   mutations, remote scripts, sensitive parameters or recognizable credentials, and
   private/local destinations. Such operations are **not sent to OpenRouter**.
3. Jev assesses remaining operations using fixed criteria and untrusted tool arguments.
   Only `safe` with safe probability **at least 0.95** runs automatically. The probability
   threshold is a heuristic, not a security guarantee or accuracy claim.
4. Risky, uncertain, low-safe-probability, opaque file execution, and uninspectable
   wrappers need **Allow once**. The complete escaped JSON operation is shown;
   **Deny** is first. Escape/cancellation/unrecognized answers deny. There is no approval
   cache or session-wide allow. Jev returns a category/probabilities, not prose reasoning.
5. Missing keys, invalid/oversized inputs, HTTP failures, malformed responses, a
   **10-second** classifier timeout, and cancellation block execution. Classification
   failure does not become an approval bypass. Errors are sanitized; provider response
   bodies and credentials are not included in failure messages.

Safe calls can run in noninteractive mode. Calls requiring approval block without a UI.
Interactive and RPC-supported select dialogs are used when `ctx.hasUI` is true.
Concurrent prompts are serialized; cancelled waiters do not open a dialog. Pi's abort
signal is forwarded to both HTTP and approval UI when available. Inputs are rechecked
before prompting and before granting permission; changing them invalidates approval.
For file-based execution the extension does **not** load files into classifier context;
permission is required because their contents are opaque.

## Privacy and limitations

**Enabling this extension consents to sending classifier-eligible tool arguments
(including commands, code, URLs, searches, and request bodies) to OpenRouter/TypeSafe.**
No conversation history, environment dump, or local file contents are added. Local
rules avoid forwarding recognizable secrets, but are **not a reliable redaction
system**; arbitrary sensitive text can still reach the classifier. Do not enable it
where third-party processing of those inputs is unacceptable. The classifier's own
request uses the fixed HTTPS endpoint, refuses redirects, and is not recursively gated.

- Local rules and Jev can both miss hazards, misunderstand effects, or be fooled by
  adversarial/obfuscated input. Legitimate operations can also trigger extra prompts.
- DNS, redirects, runtime-generated code, external executables, and changes to scripts
  after approval are not enforced at runtime. Private destination checks inspect URL
  literals, not actual connections or redirect targets.
- Pi extensions run with the agent's OS privileges. Their internal network/process
  calls, the agent's own provider calls, and code paths bypassing tool events are not
  intercepted. The guard cannot defend itself against code with the same permissions.
- Other `tool_call` handlers run in extension order and can mutate arguments **after**
  this guard returns. Load this guard after trusted input-transforming extensions where
  possible; the snapshot check cannot prevent later mutations. Other `user_bash`
  handlers can consume commands before this hook. Review extension ordering.
- Each subagent in another process needs the extension and enabling environment in that
  process. Configuring it in the parent does not prove child-process coverage.
- There is no automatic audit log or persisted approval state. Pi's normal transcript
  handling still applies; this extension does not redact the transcript.

Use OS/process/filesystem/network isolation when you need an enforcement boundary.

## Development and checks

```bash
npm ci --prefix pi/extensions/pi-exec-guard --ignore-scripts
npm test --prefix pi/extensions/pi-exec-guard
npm run typecheck --prefix pi/extensions/pi-exec-guard
bash tests/test_install_pi.sh
bash -n install-pi tests/test_install_pi.sh tests/test_install_commands.sh
```

Tests exercise real policy/Effect logic with fake HTTP and Pi UI boundaries. They do
not execute hazardous commands or contact OpenRouter. The installer uses `--omit=dev
--omit=peer`; rerun development `npm ci` before typechecking after running the installer.

The development dependency override pins `pi-codemode` to 1.1.0 to match the Pi 1.1.0
loader: allowing its newer 1.3.0 release removes an export required by that loader.
The real-loader smoke test exercises this boundary. Neither Pi nor codemode is installed
as a runtime dependency of the guard.

API reference: <https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request>.
