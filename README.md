# .agent

Personal coding harness configuration (Claude Code and Pi) —
harness-specific guidance, global settings, and skills symlinked into each harness's config directory.

## Structure

```
dotagent/
├── AGENTS.md          # Shared agent operating instructions
├── claude.settings.json # Claude Code settings
├── pi.settings.json   # Pi provider, model, thinking, and theme defaults
├── install            # Install Claude Code and Pi
├── install-claude     # Claude Code: symlinks + plugin install
├── install-pi         # Pi: symlinks, packages, and theme
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
./install            # Claude Code and default Pi profile
./install --pi-dir ~/.pi/work
./install --pi-dir ~/.pi/work --provider github-copilot
./install-claude     # Claude Code only
./install-pi         # Pi only
./install-pi --dir ~/.pi/work
./install-pi --dir ~/.pi/work --provider github-copilot
```

## Harness config locations

| Harness     | Context file                   | Skills                       | Settings                    |
| ----------- | ------------------------------ | ---------------------------- | --------------------------- |
| Claude Code | `~/.claude/CLAUDE.md`          | `~/.claude/skills/`          | `~/.claude/settings.json`   |
| Pi          | `<pi-dir>/AGENTS.md`           | `<pi-dir>/skills/`           | `<pi-dir>/settings.json`    |

## Plugins (Claude Code)

| Plugin            | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `superpowers`     | Workflow skills: spec, plan, checkpoint, TDD, debugging, brainstorming, etc. |
| `frontend-design` | Production-grade UI component generation                                     |
| `hegel-skill`     | Property-based testing with Hegel (also vendored in `skills/hegel/` for Pi) |

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
