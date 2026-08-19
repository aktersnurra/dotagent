import type { ExtensionCommandContext, Skill } from "@earendil-works/pi-coding-agent";
import {
  projectSkillVisibility,
  type EnforcementResult,
} from "./enforcer.ts";
import { readSkillFingerprint } from "./frontmatter.ts";
import {
  buildSavedRegistry,
  readVisibilityRegistry,
  visibilityRegistryPath,
  writeVisibilityRegistry,
  type VisibilityRegistry,
} from "./registry.ts";
import {
  resolveSkillInventory,
  type ResolvedInventory,
  type ResolvedSkill,
} from "./resolver.ts";
import { showSkillToggleUi, type SkillToggleUiResult } from "./toggle-overlay.ts";
import type { ToggleRow } from "./toggle-model.ts";

export interface ToggleCommandDependencies {
  registryPath(): string;
  readRegistry(path: string): Promise<VisibilityRegistry>;
  writeRegistry(path: string, registry: VisibilityRegistry): Promise<void>;
  resolve(skills: Skill[], overrides: VisibilityRegistry["overrides"]): Promise<ResolvedInventory<Skill>>;
  fingerprint(path: string): Promise<string>;
  project(
    skills: Array<ResolvedSkill<Skill>>,
    expectedFingerprints: ReadonlyMap<string, string>,
  ): Promise<EnforcementResult>;
  showUi(ctx: ExtensionCommandContext, rows: ToggleRow[]): Promise<SkillToggleUiResult>;
}

const defaultDependencies: ToggleCommandDependencies = {
  registryPath: visibilityRegistryPath,
  readRegistry: readVisibilityRegistry,
  writeRegistry: writeVisibilityRegistry,
  resolve: resolveSkillInventory,
  fingerprint: readSkillFingerprint,
  project: projectSkillVisibility,
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

  if (inventory.errors.length > 0) {
    ctx.ui.notify(formatErrors(
      `${inventory.errors.length} skill installation${inventory.errors.length === 1 ? "" : "s"} skipped during resolution`,
      inventory.errors,
    ), "warning");
  }

  const popupFingerprints = new Map<string, string>();
  const snapshotErrors: Array<{ name: string; message: string }> = [];
  for (const item of inventory.skills) {
    try {
      popupFingerprints.set(item.canonicalPath, await dependencies.fingerprint(item.canonicalPath));
    } catch (error) {
      snapshotErrors.push({ name: item.skill.name, message: message(error) });
    }
  }
  if (snapshotErrors.length > 0) {
    ctx.ui.notify(formatErrors(
      `${snapshotErrors.length} skill content snapshot${snapshotErrors.length === 1 ? "" : "s"} unavailable`,
      snapshotErrors,
    ), "warning");
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

  const desired = new Map(result.drafts.map((draft) => [draft.id, draft.desiredMode]));
  const affected = inventory.skills.flatMap((item) => {
    const desiredMode = desired.get(item.canonicalPath);
    if (desiredMode === undefined || desiredMode === item.mode) return [];
    return [{ ...item, mode: desiredMode }];
  });
  if (affected.length === 0) {
    ctx.ui.notify("No skill visibility changes", "info");
    return;
  }

  const saved = buildSavedRegistry(inventory.skills, desired);
  try {
    await dependencies.writeRegistry(path, saved);
  } catch (error) {
    ctx.ui.notify(`Could not save skill visibility registry at ${path}: ${message(error)}`, "error");
    return;
  }

  const enforcement = await dependencies.project(affected, popupFingerprints);
  ctx.ui.notify(
    formatApplyResult(affected.length, enforcement),
    enforcement.errors.length ? "warning" : "info",
  );
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
    for (const error of result.errors.slice(0, 3)) {
      lines.push(`- ${error.name}: ${bound(error.message)}`);
    }
    if (result.errors.length > 3) lines.push(`- … ${result.errors.length - 3} more`);
  }
  lines.push("Reloading Pi resources.");
  return lines.join("\n");
}

function formatErrors(prefix: string, errors: Array<{ name: string; message: string }>): string {
  const lines = [prefix];
  for (const error of errors.slice(0, 3)) lines.push(`- ${error.name}: ${bound(error.message)}`);
  if (errors.length > 3) lines.push(`- … ${errors.length - 3} more`);
  return lines.join("\n");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bound(value: string, maxLength = 200): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
