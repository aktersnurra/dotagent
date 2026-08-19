import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_VISIBLE_SKILL_NAMES,
  defaultSkillVisibility,
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

test("checked-in Startup defaults match the approved 28 skills", () => {
  assert.deepEqual([...AGENT_VISIBLE_SKILL_NAMES].sort(), [...expectedAgentVisible].sort());
  assert.equal(AGENT_VISIBLE_SKILL_NAMES.size, 28);
  assert.equal(defaultSkillVisibility("systematic-debugging"), "startup");
  assert.equal(defaultSkillVisibility("wiki"), "manual");
  assert.equal(defaultSkillVisibility("new-package-skill"), "manual");
});
