# Pi Skill Visibility Design

## Goal

Reduce Pi's startup context by exposing only skills that the agent must select
automatically. Keep specialized and maintenance skills available through
`/skill:<name>` without advertising them to the model.

Pi already loads full skill instructions on demand. This design reduces the
remaining startup cost: the names and descriptions included in the system
prompt.

## Visibility Policy

The extension enforces two modes:

- **Agent-visible:** Pi includes the skill name and description in the system
  prompt. The agent can select and load it automatically.
- **User-invokable:** Pi omits the skill from the system prompt but retains its
  `/skill:<name>` command. This uses the standard
  `disable-model-invocation: true` frontmatter field.

### Agent-visible allowlist

The agent-visible set contains automatic correctness rules, development
workflow routing, tool routing, and domain guidance that should activate from
code or task context:

```text
brainstorming
context-mode
design-doctrine
dispatching-parallel-agents
elixir
executing-plans
finishing-a-development-branch
hegel
jj
mcp-scripting
ocaml
pi-lens-ast-grep
pi-lens-lsp-navigation
pi-subagents
pire-browser
receiving-code-review
requesting-code-review
subagent-driven-development
systematic-debugging
test-driven-development
tiger-style
type-driven-development
ui-design
using-jj-workspaces
using-superpowers
verification-before-completion
writing-plans
writing-skills
```

All other discovered skills are user-invokable by default, except the bundled
`ask-user` skill. The installer keeps `npm:pi-ask-user` for the `ask_user` tool
but configures that package with `skills: []`, so the redundant skill is not
loaded or registered as a slash command.

### Initial user-invokable set

```text
First Principles Thinking
ctx-doctor
ctx-index
ctx-insight
ctx-purge
ctx-search
ctx-stats
ctx-upgrade
explain
explicit-uv-env-files
grill-me
grilling
looter
pi-lens-write-ast-grep-rule
pi-lens-write-tree-sitter-rule
refresh-family-car-search
ste-writing
transcribing-youtube-videos
tuicr
wiki
```

`grill-me` remains manual-only and is a cleanup candidate because `grilling`
appears to supersede it. Removing or consolidating it is outside this change.

## Architecture

Add a versioned global Pi extension to this repository and install it through
`install-pi`.

```text
pi/extensions/pi-skill-visibility/
├── index.ts
├── policy.ts
├── frontmatter.ts
└── *.test.ts
```

The components have separate responsibilities:

- `policy.ts` owns the agent-visible allowlist and maps a skill name to its
  desired visibility.
- `frontmatter.ts` reads and minimally patches the
  `disable-model-invocation` field while preserving unrelated content, line
  endings, and formatting.
- `index.ts` discovers loaded skills, applies the policy during startup, and
  reports actionable failures.
- Tests cover policy classification, frontmatter edits, idempotence, discovery,
  and startup enforcement.

`install-pi` creates the Pi extensions directory and links the versioned
extension into `<pi-dir>/extensions/pi-skill-visibility`. Installation remains
idempotent and must not replace an unrelated existing path.

## Discovery

The extension must cover every skill source Pi can load:

- `<pi-dir>/skills`
- `~/.agents/skills`
- project `.pi/skills`
- project and ancestor `.agents/skills`
- skill paths declared directly in settings
- npm, git, and local Pi package skill resources

Discovery follows Pi's package manifests, conventional skill directories, and
settings filters. It resolves symlinks and deduplicates files by canonical
path. It does not treat arbitrary nested `SKILL.md` files as loaded skills when
Pi's manifest or filters exclude them.

The extension records each discovered skill's name, canonical file path,
source, editability, current visibility, and desired visibility. Invalid or
ambiguous frontmatter is reported and left unchanged.

## Startup Enforcement

Enforcement runs before the first model request:

1. Discover all currently loaded skills.
2. Classify each skill using the allowlist.
3. Plan only the frontmatter changes needed to reach the desired state.
4. Apply changes atomically.
5. Continue startup without a reload when Pi has not yet materialized the
   system prompt.

The implementation must verify Pi's actual resource-loading order. If an
extension cannot patch skills before metadata is materialized, startup must use
a supported resource lifecycle hook that completes before the first agent turn.
It must not trigger a synthetic user message or an extra model turn.

Enforcement is idempotent. A startup with compliant skills performs no writes
and no reload. Newly installed or updated packages are corrected on the next
startup.

## Frontmatter Rules

For a user-invokable skill:

```yaml
disable-model-invocation: true
```

For an agent-visible skill, remove the field rather than writing `false`. This
restores the ordinary Agent Skills representation and avoids unnecessary
frontmatter.

The patcher must:

- preserve the body and all unrelated frontmatter fields byte-for-byte;
- preserve LF or CRLF line endings;
- reject duplicate `disable-model-invocation` keys;
- reject missing or malformed frontmatter;
- write through a temporary file followed by an atomic rename;
- avoid touching a file when its desired state already matches.

## Package Updates and Writable Sources

Package updates can replace edited package files. This is expected: startup
enforcement reapplies the policy after an update.

A read-only or otherwise uneditable skill does not block Pi startup. The
extension leaves it unchanged and emits one concise warning containing the
skill name, source, and path. Other skills continue to be processed.

## User Control

The initial version uses a declarative allowlist committed in this repository.
It does not include the reference extension's interactive overlay. This keeps
the startup policy reviewable, testable, and reproducible across Pi profiles.

A future toggle UI may edit an override file, but it must remain a separate
feature. It must not mutate the committed default policy implicitly.

## Safety and Error Handling

- Never rewrite a skill body.
- Never overwrite an unrelated extension installation path.
- Deduplicate canonical paths before writing.
- Continue past per-skill read, parse, permission, and write failures.
- Summarize failures once rather than producing one notification per skill.
- Do not start watchers, timers, subprocesses, or other long-lived resources.
- Do not perform a reload loop.

## Verification

Automated verification covers:

- every allowlisted name remains agent-visible;
- every non-allowlisted name becomes user-invokable;
- adding and removing `disable-model-invocation` preserves all other bytes;
- repeated enforcement performs zero additional writes;
- duplicate or malformed frontmatter is rejected safely;
- symlinked skills are patched once;
- package manifest and settings filters are honored;
- read-only skills produce warnings without blocking other changes;
- `install-pi` installs the extension idempotently and refuses collisions.

An integration check installs Pi into a temporary profile, runs startup
enforcement, and confirms:

1. agent-visible skills appear in the generated skill metadata;
2. user-invokable skills do not appear in that metadata;
3. both groups retain their `/skill:<name>` commands;
4. a second startup makes no file changes.
