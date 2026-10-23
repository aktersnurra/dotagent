# Agent Guidance

## Purpose

This file is the shared operating contract for installed coding harnesses. It should not
duplicate full workflows from installed skills; invoke the relevant skill and follow it.

## Instruction precedence

1. System and developer instructions from the active harness.
2. Direct user instructions in the current conversation.
3. Repository-local guidance and active plans/specs.
4. Invoked skill instructions.
5. This file.
6. Default model behavior.

Within the same level, prefer the more specific instruction, then the more recent one.
Ask only when an unresolved conflict changes the outcome.

## Skill routing

- Use skills available in the active harness. If a required skill is unavailable,
  state the limitation. Continue when the remaining guidance is sufficient.
- Use the applicable Superpowers skills for features, patches, bug fixes, refactors,
  planning, implementation, review, and verification.
- Use `using-superpowers` at conversation start and whenever a Superpowers workflow may
  apply.
- Use `brainstorming` before creative changes or behavior changes unless the user has
  already approved the design.
- Use `test-driven-development` for feature work, bug fixes, refactors, and behavior
  changes. For pure config/doc edits, verify with focused shell checks.
- Use `systematic-debugging` before fixing bugs, failing tests, or unexpected behavior.
- Use `verification-before-completion` before claiming work is done, fixed, or passing.
- Use `jj` for all Jujutsu operations.
- Use domain/design skills for model-heavy work: `system-design`,
  `type-driven-development`, `tiger-style`.
- Use language skills for language-specific work: `elixir`, `ocaml`.
- Use `bonsai` for Bonsai state, effects, components, and tests.
- Use `ui-design` for screens, components, layouts, and visual design review.
  Use the frontend-design plugin when available.

## Operating discipline

- Proceed within authorized scope using reasonable, reversible assumptions.
  Ask when a missing answer materially changes correctness, scope, or reversibility.
- Read the relevant code and inspect the current diff before editing.
  Preserve unrelated and uncommitted work.
- Touch only what the task requires.
- Do not clean up adjacent code, comments, formatting, or old imports unless your change
  made them wrong.
- Do not add speculative features, abstractions, or error handling.
- Fix the root cause in the layer that owns it.
  Do not mask broken invariants with fallbacks, swallowed errors, or defaults that imply success.
- Before adding complexity for a speculative or vanishingly unlikely race or security
  edge case, explain the concrete failure mode, likelihood, and complexity cost to the
  user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Prefer the smallest API and the fewest moving parts that satisfy the request.
- Validate external input once at the boundary that owns it, then pass typed values
  inward. Do not revalidate guarantees already established by a schema, constructor,
  or internal type.
- Extract helpers when they name a meaningful concept, clarify a complex boundary,
  or enable reuse. Keep straightforward single-use logic at the call site.
- Keep pure work pure. Parsing, validation, and option construction should stay
  synchronous when they perform no effects.
- Test the real implementation and observable behavior; do not duplicate implementation
  logic in tests. Prefer real collaborators and mock only where necessary. UI previews
  should render production components.
- Keep one task in progress at a time when using todos.
- Run focused checks for the changed behavior before making success claims.
  Name the checks and distinguish passed, failed, and not run.
- Review the final diff for scope, accidental edits, and consistency with the request.
- If verification fails, report the failure and keep the work open.

## Model usage

- Honor the user's model and thinking settings.
- Match reasoning effort to uncertainty and consequences, including during implementation.
- Prefer Opus for planning and specs when available and compatible with the user's settings.
