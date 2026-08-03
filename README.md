# .agent

Personal Coding Harness configuration (Claude Code, Opencode, Pi) —
harness-specific guidance, global settings, and skills symlinked into each harness's config directory.

## Structure

```
dotagent/
├── AGENTS.md          # Pi-specific workflow, tool, and skill routing
├── CLAUDE.md          # Claude Code / Claude-like workflow and plugin routing
├── settings.json      # Claude Code settings (model, hooks, permissions, theme)
├── install            # Install all harnesses
├── install-claude     # Claude Code: symlinks + plugin install
├── install-opencode   # Opencode: symlinks, plugins, browser automation
├── install-pi         # Pi: symlinks
└── skills/
    ├── design-doctrine/ # Explicit, evolvable domain-core design
    ├── elixir/        # Elixir/BEAM, OTP, Phoenix, Ecto, Nx conventions
    ├── explain/       # Detailed explanations, walkthroughs, and durable docs
    ├── hegel/         # Property-based testing with Hegel (Rust, Go, C++, TypeScript, OCaml)
    ├── jj/            # Jujutsu VCS idioms and workflows
    ├── ocaml/         # OCaml idioms, Eio, dune, testing conventions
    ├── tiger-style/   # Tiger Style naming and API design conventions
    ├── type-driven/   # Type-driven design and railway-oriented programming
    ├── ui-design/     # First-principles UI design reasoning
    └── ui-design-checklist/ # Fast UI design review checklist
```

## Install

```sh
./install            # all harnesses
./install-claude     # Claude Code only
./install-opencode   # Opencode only
./install-pi         # Pi only
```

## Harness config locations

| Harness     | Context file                   | Skills                       | Settings                    |
| ----------- | ------------------------------ | ---------------------------- | --------------------------- |
| Claude Code | `~/.claude/CLAUDE.md`          | `~/.claude/skills/`          | `~/.claude/settings.json`   |
| Opencode    | `~/.config/opencode/CLAUDE.md` | `~/.config/opencode/skills/` | —                           |
| Pi          | `~/.pi/agent/AGENTS.md`        | `~/.pi/agent/skills/`        | `~/.pi/agent/settings.json` |

## OpenCode integrations

`install-opencode` creates the default `~/.config/opencode/opencode.jsonc` with:

- `@mohak34/opencode-notifier` for macOS desktop notifications and sounds on completion, permission, error, and question events.
- `@playwright/mcp` configured to launch Chrome, allowing agents to exercise browser flows.

The installer will not overwrite a custom OpenCode config. Add the entries from
`install-opencode` manually when one already exists.

## Plugins (Claude Code)

| Plugin            | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `superpowers`     | Workflow skills: spec, plan, checkpoint, TDD, debugging, brainstorming, etc. |
| `frontend-design` | Production-grade UI component generation                                     |
| `hegel-skill`     | Property-based testing with Hegel (also vendored in `skills/hegel/` for Pi/Opencode) |

## Skills

| Skill                 | Trigger                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `design-doctrine`     | Domain cores, verifier pipelines, state machines, LLM artifact workflows |
| `elixir`              | Elixir/BEAM code, OTP, Phoenix, Ecto, Nx, ExUnit                         |
| `explain`             | Detailed explanations, walkthroughs, app/service overviews, durable docs |
| `hegel`               | Writing property-based tests (Rust, Go, C++, TypeScript, OCaml)          |
| `jj`                  | Any jj/jujutsu VCS operation                                             |
| `ocaml`               | OCaml code, Eio, Lwt, GADTs, dune                                        |
| `tiger-style`         | Naming functions, types, designing APIs                                  |
| `type-driven`         | Modelling errors, designing interfaces, ADTs, ROP                        |
| `ui-design`           | Designing or reviewing screens, components, and layouts                  |
| `ui-design-checklist` | Fast UI design review or diagnosis                                       |
