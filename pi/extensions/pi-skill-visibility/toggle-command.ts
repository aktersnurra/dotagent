import type { ExtensionCommandContext, Skill } from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import {
  buildSavedRegistry,
  readVisibilityRegistry,
  visibilityRegistryPath,
  writeVisibilityRegistry,
  type VisibilityRegistry,
} from "./registry.ts";
import { resolveSkillInventory, type ResolvedInventory } from "./resolver.ts";
import { showSkillToggleUi, type SkillToggleUiResult } from "./toggle-overlay.ts";
import type { ToggleRow } from "./toggle-model.ts";

export interface ToggleCommandDependencies {
  registryPath(): string;
  readRegistry(path: string): Promise<VisibilityRegistry>;
  writeRegistry(path: string, registry: VisibilityRegistry): Promise<void>;
  resolve(skills: Skill[], overrides: VisibilityRegistry["overrides"]): Promise<ResolvedInventory<Skill>>;
  enforce(skills: Skill[], overrides: VisibilityRegistry["overrides"]): Promise<EnforcementResult>;
  showUi(ctx: ExtensionCommandContext, rows: ToggleRow[]): Promise<SkillToggleUiResult>;
}

const defaultDependencies: ToggleCommandDependencies = {
  registryPath: visibilityRegistryPath,
  readRegistry: readVisibilityRegistry,
  writeRegistry: writeVisibilityRegistry,
  resolve: resolveSkillInventory,
  enforce: enforceSkillVisibility,
  showUi: showSkillToggleUi,
};

export async function runToggleSkillsCommand(
  ctx: ExtensionCommandContext,
  dependencies: ToggleCommandDependencies = defaultDependencies,
): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify("/toggle-skills requires interactive Pi", "error");
    return;
  }

  const skills = (ctx.getSystemPromptOptions().skills ?? []) as Skill[];
  if (skills.length === 0) {
    ctx.ui.notify("No skills found", "info");
    return;
  }

  const path = dependencies.registryPath();
  let registry: VisibilityRegistry;
  let inventory: ResolvedInventory<Skill>;
  try {
    registry = await dependencies.readRegistry(path);
    inventory = await dependencies.resolve(skills, registry.overrides);
  } catch (error) {
    ctx.ui.notify(`Could not read skill visibility registry at ${path}: ${message(error)}`, "error");
    return;
  }

  if (inventory.skills.length === 0) {
    ctx.ui.notify(formatErrors("No usable skills found", inventory.errors), "warning");
    return;
  }

  const rows = inventory.skills.map((item): ToggleRow => ({
    id: item.canonicalPath,
    name: item.skill.name,
    description: item.skill.description,
    sourceLabel: sourceLabel(item.skill),
    savedMode: item.mode,
  }));
  const result = await dependencies.showUi(ctx, rows);
  if (result.action === "cancel") return;

  const changed = result.drafts.filter((draft) => {
    const row = rows.find((candidate) => candidate.id === draft.id);
    return row && row.savedMode !== draft.desiredMode;
  });
  if (changed.length === 0) {
    ctx.ui.notify("No skill visibility changes", "info");
    return;
  }

  const desired = new Map(result.drafts.map((draft) => [draft.id, draft.desiredMode]));
  const saved = buildSavedRegistry(inventory.skills, desired);
  try {
    await dependencies.writeRegistry(path, saved);
  } catch (error) {
    ctx.ui.notify(`Could not save skill visibility registry at ${path}: ${message(error)}`, "error");
    return;
  }

  const enforcement = await dependencies.enforce(skills, saved.overrides);
  ctx.ui.notify(formatApplyResult(changed.length, enforcement), enforcement.errors.length ? "warning" : "info");
  await ctx.reload();
  return;
}

function sourceLabel(skill: Skill): string {
  if (skill.sourceInfo.origin === "package") return skill.sourceInfo.source;
  if (skill.sourceInfo.scope === "project") return "Project";
  if (skill.sourceInfo.scope === "temporary") return "Temporary";
  return "Local";
}

function formatApplyResult(changes: number, result: EnforcementResult): string {
  const lines = [`Applied ${changes} change${changes === 1 ? "" : "s"} to skill visibility.`];
  if (result.errors.length) {
    lines.push(`${result.errors.length} file projection${result.errors.length === 1 ? "" : "s"} skipped.`);
    for (const error of result.errors.slice(0, 3)) lines.push(`- ${error.name}: ${error.message}`);
    if (result.errors.length > 3) lines.push(`- … ${result.errors.length - 3} more`);
  }
  lines.push("Reloading Pi resources.");
  return lines.join("\n");
}

function formatErrors(prefix: string, errors: Array<{ name: string; message: string }>): string {
  return [prefix, ...errors.slice(0, 3).map((error) => `- ${error.name}: ${error.message}`)].join("\n");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
