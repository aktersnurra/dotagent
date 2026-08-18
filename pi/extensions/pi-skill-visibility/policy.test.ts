import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_VISIBLE_SKILL_NAMES,
  desiredDisableModelInvocation,
} from "./policy.ts";

const expectedAgentVisible = [
  "brainstorming",
  "context-mode",
  "design-doctrine",
  "dispatching-parallel-agents",
  "elixir",
  "executing-plans",
  "finishing-a-development-branch",
  "hegel",
  "jj",
  "mcp-scripting",
  "ocaml",
  "pi-lens-ast-grep",
  "pi-lens-lsp-navigation",
  "pi-subagents",
  "pire-browser",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "tiger-style",
  "type-driven-development",
  "ui-design",
  "using-jj-workspaces",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
  "writing-skills",
] as const;

test("agent-visible allowlist matches the approved policy", () => {
  assert.deepEqual([...AGENT_VISIBLE_SKILL_NAMES].sort(), [...expectedAgentVisible].sort());
  assert.equal(AGENT_VISIBLE_SKILL_NAMES.size, 28);
});

test("allowlisted skills stay model-invocable", () => {
  assert.equal(desiredDisableModelInvocation("systematic-debugging"), false);
  assert.equal(desiredDisableModelInvocation("elixir"), false);
});

test("all other skills become manual-only", () => {
  assert.equal(desiredDisableModelInvocation("ask-user"), true);
  assert.equal(desiredDisableModelInvocation("ctx-purge"), true);
  assert.equal(desiredDisableModelInvocation("wiki"), true);
  assert.equal(desiredDisableModelInvocation("new-package-skill"), true);
});
