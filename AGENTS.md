# Pi Agent Guidance

## Purpose

This file is for Pi only. It is the routing layer for Pi packages, tools, and skills. It should not duplicate full workflows from installed skills; invoke the relevant skill and follow it.

## Instruction precedence

1. Direct user instructions in the current conversation.
2. Repository-local guidance and active plans/specs.
3. Invoked skill instructions.
4. This file.
5. Default model behavior.

If instructions conflict, prefer the more specific and more recent instruction. Ask only when the conflict changes the outcome.

## Pi routing

- Use the applicable Superpowers skills for features, patches, bug fixes, refactors, planning, implementation, review, and verification.
- Use `using-superpowers` at conversation start and whenever a Superpowers workflow may apply.
- Use `brainstorming` before creative changes or behavior changes unless the user has already approved the design.
- Use `test-driven-development` for feature work, bug fixes, refactors, and behavior changes. For pure config/doc edits, verify with focused shell checks.
- Use `systematic-debugging` before fixing bugs, failing tests, or unexpected behavior.
- Use `verification-before-completion` before claiming work is done, fixed, or passing.
- Use `jj` for all Jujutsu operations.
- Use domain/design skills for model-heavy work: `design-doctrine`, `type-driven-development`, `tiger-style`.
- Use language skills for language-specific work: `elixir`, `ocaml`.
- Use UI skills for screens, components, layouts, and visual design review.
- Use `context-mode` tools for large outputs: tests, logs, dependency trees, git history, API responses, docs, and generated snapshots.
- Use `lsp-navigation` for code intelligence and diagnostics.
- Use `ast-grep` for semantic code search or replacement.
- Use RPIV skills for artifact workflows: `discover`, `research`, `explore`, `design`, `plan`, `blueprint`, `implement`, `validate`, `code-review`, `revise`.
- Use `pi-subagents` or Pi subagents when independent work can run in parallel or a focused reviewer/researcher should preserve main context.

## Operating discipline

- Touch only what the task requires.
- Do not clean up adjacent code, comments, formatting, or old imports unless your change made them wrong.
- Do not add speculative features, abstractions, or error handling.
- Prefer the smallest API and the fewest moving parts that satisfy the request.
- Keep one task in progress at a time when using todos.
- Verify before making success claims. Say what command or check proves the claim.
- If verification fails, report the failure and keep the work open.

## Model usage

- Planning and spec work: prefer extended thinking.
- Implementation: proceed without extended thinking unless stuck.
- Spec and plan sessions should use Opus when available.
