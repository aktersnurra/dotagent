import { realpath } from "node:fs/promises";
import { writeSkillVisibility } from "./frontmatter.ts";
import {
  resolveSkillInventory,
  type ResolvedSkill,
  type SkillIdentity,
  type VisibilityOverrides,
} from "./resolver.ts";

export type { SkillIdentity } from "./resolver.ts";

export interface VisibilityError {
  name: string;
  path: string;
  message: string;
}

export interface EnforcementResult {
  resolved: ResolvedSkill[];
  changed: string[];
  errors: VisibilityError[];
}

interface Dependencies {
  realpath(path: string): Promise<string>;
  writeVisibility(path: string, disabled: boolean): Promise<{ changed: boolean }>;
}

const defaultDependencies: Dependencies = {
  realpath,
  writeVisibility: writeSkillVisibility,
};

export async function enforceSkillVisibility(
  skills: SkillIdentity[],
  overrides: VisibilityOverrides,
  dependencies: Dependencies = defaultDependencies,
): Promise<EnforcementResult> {
  const inventory = await resolveSkillInventory(skills, overrides, dependencies.realpath);
  const changed: string[] = [];
  const errors: VisibilityError[] = [...inventory.errors];

  for (const resolved of inventory.skills) {
    try {
      const result = await dependencies.writeVisibility(
        resolved.canonicalPath,
        resolved.mode === "manual",
      );
      if (result.changed) changed.push(resolved.skill.filePath);
    } catch (error) {
      errors.push({
        name: resolved.skill.name,
        path: resolved.skill.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { resolved: inventory.skills, changed, errors };
}
