# Agent Guidance

## Purpose

This file is the shared operating contract for installed coding harnesses. It should not
duplicate full workflows from installed skills; invoke the relevant skill and follow it.

## Instruction precedence

1. Direct user instructions in the current conversation.
2. Repository-local guidance and active plans/specs.
3. Invoked skill instructions.
4. This file.
5. Default model behavior.

If instructions conflict, prefer the more specific and more recent instruction. Ask only
when the conflict changes the outcome.

## Skill routing

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
- Use UI skills and the frontend-design plugin for screens, components, layouts, and
  visual design review.

## Operating discipline

- Touch only what the task requires.
- Do not clean up adjacent code, comments, formatting, or old imports unless your change
  made them wrong.
- Do not add speculative features, abstractions, or error handling.
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
- Verify before making success claims. Say what command or check proves the claim.
- If verification fails, report the failure and keep the work open.

## Model usage

- Planning and spec work: prefer extended thinking.
- Implementation: proceed without extended thinking unless stuck.
- Spec and plan sessions should use Opus when available.
