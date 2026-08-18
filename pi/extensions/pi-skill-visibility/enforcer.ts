import { realpath } from "node:fs/promises";
import { writeSkillVisibility } from "./frontmatter.ts";
import { desiredDisableModelInvocation } from "./policy.ts";

export interface SkillIdentity {
  name: string;
  filePath: string;
}

export interface VisibilityError {
  name: string;
  path: string;
  message: string;
}

export interface EnforcementResult {
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
  dependencies: Dependencies = defaultDependencies,
): Promise<EnforcementResult> {
  const seen = new Set<string>();
  const changed: string[] = [];
  const errors: VisibilityError[] = [];

  for (const skill of skills) {
    try {
      const canonicalPath = await dependencies.realpath(skill.filePath);
      if (seen.has(canonicalPath)) continue;
      seen.add(canonicalPath);
      const result = await dependencies.writeVisibility(
        canonicalPath,
        desiredDisableModelInvocation(skill.name),
      );
      if (result.changed) changed.push(skill.filePath);
    } catch (error) {
      errors.push({
        name: skill.name,
        path: skill.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { changed, errors };
}
