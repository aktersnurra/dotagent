export const AGENT_VISIBLE_SKILL_NAMES: ReadonlySet<string> = new Set([
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
]);

export type SkillVisibilityMode = "startup" | "manual";

export function defaultSkillVisibility(name: string): SkillVisibilityMode {
  return AGENT_VISIBLE_SKILL_NAMES.has(name) ? "startup" : "manual";
}

export function desiredDisableModelInvocation(name: string): boolean {
  return defaultSkillVisibility(name) === "manual";
}
