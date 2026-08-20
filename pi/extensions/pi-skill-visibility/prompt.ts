import type { SkillVisibilityMode } from "./policy.ts";

export interface PromptSkill {
  name: string;
  filePath: string;
  disableModelInvocation: boolean;
}

type SkillFormatter<T extends PromptSkill> = (skills: T[]) => string;

export interface PromptRewriteResult {
  systemPrompt: string;
  error?: string;
}

export function rewriteSkillPrompt<T extends PromptSkill>(
  systemPrompt: string,
  skills: T[],
  modesByPath: ReadonlyMap<string, SkillVisibilityMode>,
  formatter: SkillFormatter<T>,
  includeSkills = true,
): PromptRewriteResult {
  if (!includeSkills) return { systemPrompt };

  const originalBlock = formatter(skills);
  const desiredSkills = skills
    .filter((skill) => modesByPath.get(skill.filePath) === "startup")
    .map((skill) => ({ ...skill, disableModelInvocation: false }) as T);
  const desiredBlock = formatter(desiredSkills);

  if (originalBlock.length > 0 && systemPrompt.includes(originalBlock)) {
    return { systemPrompt: systemPrompt.replace(originalBlock, desiredBlock) };
  }

  const marker = "\nCurrent working directory:";
  const markerIndex = systemPrompt.lastIndexOf(marker);
  const currentSkillsMarker = "[Skills]\n";
  const currentSkillsIndex = systemPrompt.indexOf(currentSkillsMarker);
  if (currentSkillsIndex >= 0 && markerIndex > currentSkillsIndex) {
    const currentBlock = `${currentSkillsMarker}  ${desiredSkills.map((skill) => skill.name).join(", ")}\n`;
    return {
      systemPrompt: `${systemPrompt.slice(0, currentSkillsIndex)}${currentBlock}${systemPrompt.slice(markerIndex)}`,
    };
  }

  if (desiredBlock.length === 0) return { systemPrompt };
  if (markerIndex < 0) {
    return { systemPrompt, error: "could not locate Pi's working-directory marker" };
  }
  return {
    systemPrompt: `${systemPrompt.slice(0, markerIndex)}${desiredBlock}${systemPrompt.slice(markerIndex)}`,
  };
}
