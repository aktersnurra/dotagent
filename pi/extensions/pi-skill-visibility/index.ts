import {
  formatSkillsForPrompt,
  type ExtensionAPI,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import { AGENT_VISIBLE_SKILL_NAMES } from "./policy.ts";
import { rewriteSkillPrompt } from "./prompt.ts";

export default function skillVisibilityExtension(pi: ExtensionAPI): void {
  let enforcement: Promise<EnforcementResult> | undefined;
  let warned = false;

  pi.on("before_agent_start", async (event, ctx) => {
    const skills = (event.systemPromptOptions.skills ?? []) as Skill[];
    enforcement ??= enforceSkillVisibility(skills);
    const result = await enforcement;

    const rewritten = rewriteSkillPrompt(
      event.systemPrompt,
      skills,
      AGENT_VISIBLE_SKILL_NAMES,
      formatSkillsForPrompt,
      !event.systemPromptOptions.selectedTools || event.systemPromptOptions.selectedTools.includes("read"),
    );

    if (!warned && (result.errors.length > 0 || rewritten.error)) {
      warned = true;
      const details = result.errors
        .slice(0, 3)
        .map((error) => `${error.name} (${error.path}): ${error.message}`);
      if (result.errors.length > 3) details.push(`… ${result.errors.length - 3} more`);
      if (rewritten.error) details.push(rewritten.error);
      ctx.ui.notify(
        `Skill visibility policy had ${result.errors.length + (rewritten.error ? 1 : 0)} error(s):\n${details.join("\n")}`,
        "warning",
      );
    }

    return { systemPrompt: rewritten.systemPrompt };
  });
}
