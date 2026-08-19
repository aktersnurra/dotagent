import { realpath } from "node:fs/promises";
import {
  defaultSkillVisibility,
  type SkillVisibilityMode,
} from "./policy.ts";

export interface SkillIdentity {
  name: string;
  filePath: string;
}

export type VisibilityOverrides = Readonly<Record<string, SkillVisibilityMode>>;

export interface ResolvedSkill<T extends SkillIdentity = SkillIdentity> {
  skill: T;
  canonicalPath: string;
  defaultMode: SkillVisibilityMode;
  mode: SkillVisibilityMode;
}

export interface ResolutionError {
  name: string;
  path: string;
  message: string;
}

export interface ResolvedInventory<T extends SkillIdentity = SkillIdentity> {
  skills: Array<ResolvedSkill<T>>;
  errors: ResolutionError[];
}

export async function resolveSkillInventory<T extends SkillIdentity>(
  skills: T[],
  overrides: VisibilityOverrides,
  canonicalize: (path: string) => Promise<string> = realpath,
): Promise<ResolvedInventory<T>> {
  const seen = new Set<string>();
  const resolved: Array<ResolvedSkill<T>> = [];
  const errors: ResolutionError[] = [];

  for (const skill of skills) {
    try {
      const canonicalPath = await canonicalize(skill.filePath);
      if (seen.has(canonicalPath)) continue;
      seen.add(canonicalPath);
      const defaultMode = defaultSkillVisibility(skill.name);
      resolved.push({
        skill,
        canonicalPath,
        defaultMode,
        mode: overrides[canonicalPath] ?? defaultMode,
      });
    } catch (error) {
      errors.push({
        name: skill.name,
        path: skill.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { skills: resolved, errors };
}
