# .agent

Personal coding harness configuration (Claude Code and Pi) —
harness-specific guidance, global settings, and skills symlinked into each harness's config directory.

## Structure

```
dotagent/
├── AGENTS.md          # Shared agent operating instructions
├── claude.settings.json # Claude Code settings
├── pi.settings.json   # Pi provider, model, thinking, and theme defaults
├── install            # Install Claude Code, Herdr, tuicr, and Pi
├── install-claude     # Claude Code: symlinks + plugin install
├── install-herdr      # Herdr: config.toml, scripts, and plugin symlinks
├── install-tuicr      # tuicr: config.toml + theme symlinks
├── install-pi         # Pi: symlinks, packages, and theme
├── herdr/
│   ├── config.toml           # Herdr config (theme, keybindings, worktree-like jj flow)
│   ├── new-jj-workspace.sh   # prefix+shift+g: new jj workspace as a herdr workspace
│   ├── open-workspace.sh     # prefix+o: fuzzy-pick a repo/workspace to open
│   ├── review-pane.sh        # prefix+d: review the diff in tuicr, in a split pane
│   └── plugins/
│       └── next-agent/       # prefix+u: jump to the agent that needs attention
├── tuicr/
│   ├── config.toml           # tuicr config (diff view, vim comments, comment types)
│   └── themes/
│       └── no-clown-fiesta.toml  # palette ported from no-clown-fiesta.nvim
└── skills/
    ├── design-doctrine/    # Explicit, evolvable domain-core design
    ├── elixir/             # Elixir/BEAM, OTP, Phoenix, Ecto, Nx conventions
    ├── explain/            # Detailed explanations, walkthroughs, and durable docs
    ├── first-principles/   # Question assumptions, evaluate designs from scratch
    ├── grill-me/           # /grill-me slash command wrapper for grilling
    ├── grilling/           # Relentless interview to stress-test a plan or design
    ├── hegel/              # Property-based testing with Hegel (Rust, Go, C++, TypeScript, OCaml)
    ├── jj/                 # Jujutsu VCS idioms and workflows
    ├── looter/             # Research and compare live marketplace purchases
    ├── ocaml/              # OCaml idioms, Eio, dune, testing conventions
    ├── tiger-style/        # Tiger Style naming and API design conventions
    ├── transcribing-youtube-videos/ # Answer questions from YouTube video audio/captions
    ├── tuicr/               # Launch tuicr for review, read comments back (vendored)
    ├── type-driven/        # Type-driven design and railway-oriented programming
    ├── ui-design/          # First-principles UI design reasoning
    ├── wiki/               # Distill sources into a queryable personal wiki
    └── writing-docs/       # Rewrite prose into plain Simplified Technical English
```

## Install

```sh
./install            # Claude Code and default Pi profile
./install --pi-dir ~/.pi/work
./install --pi-dir ~/.pi/work --provider github-copilot
./install-claude     # Claude Code only
./install-herdr      # Herdr only
./install-tuicr      # tuicr only
./install-pi         # Pi only
./install-pi --dir ~/.pi/work
./install-pi --dir ~/.pi/work --provider github-copilot
```

## Herdr keybindings

Prefix is `ctrl+a`, matching tmux. Custom bindings on top of the defaults:

| Key              | Does                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| `prefix+u`       | Jump to the agent that needs attention (blocked, then done, then idle) |
| `prefix+o`       | Fuzzy-pick a repo or jj workspace and open it as a workspace           |
| `prefix+d`       | Review in tuicr in a split pane: the working copy, or the last commit  |
| `prefix+g`       | lazyjj popup                                                          |
| `prefix+shift+g` | New jj workspace as a sibling dir, opened as its own herdr workspace   |

`prefix+d` reviews the working copy when it is dirty. A clean working copy is
the common case under jj, so it falls back to the nearest non-empty ancestor
rather than reporting nothing to review.

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

| Skill                          | Trigger                                                                  |
| ------------------------------ | ------------------------------------------------------------------------ |
| `design-doctrine`              | Domain cores, verifier pipelines, state machines, LLM artifact workflows |
| `elixir`                       | Elixir/BEAM code, OTP, Phoenix, Ecto, Nx, ExUnit                         |
| `explain`                      | Detailed explanations, walkthroughs, app/service overviews, durable docs |
| `first-principles`             | Questioning assumptions, evaluating a design or approach from scratch   |
| `grill-me` / `grilling`        | Stress-testing a plan or design via one-question-at-a-time interview     |
| `hegel`                        | Writing property-based tests (Rust, Go, C++, TypeScript, OCaml)          |
| `jj`                           | Any jj/jujutsu VCS operation                                             |
| `looter`                       | Researching or comparing live marketplace purchases                     |
| `ocaml`                        | OCaml code, Eio, Lwt, GADTs, dune                                        |
| `tiger-style`                  | Naming functions, types, designing APIs                                  |
| `transcribing-youtube-videos`  | Answering a question from a YouTube video's audio/captions               |
| `tuicr`                        | Opening a review pane, reading review comments back (vendored upstream)  |
| `type-driven`                  | Modelling errors, designing interfaces, ADTs, ROP                        |
| `ui-design`                    | Designing or reviewing screens, components, and layouts                  |
| `wiki`                         | Capturing a YouTube/article URL into a wiki page, or querying the wiki   |
| `writing-docs`                 | Rewriting prose into plain, human-sounding technical English             |
