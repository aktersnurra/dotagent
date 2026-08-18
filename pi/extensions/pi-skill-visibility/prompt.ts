export interface PromptSkill {
  name: string;
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
  visibleNames: ReadonlySet<string>,
  formatter: SkillFormatter<T>,
  includeSkills = true,
): PromptRewriteResult {
  if (!includeSkills) return { systemPrompt };

  const originalBlock = formatter(skills);
  const desiredSkills = skills
    .filter((skill) => visibleNames.has(skill.name))
    .map((skill) => ({ ...skill, disableModelInvocation: false }) as T);
  const desiredBlock = formatter(desiredSkills);

  if (originalBlock.length > 0 && systemPrompt.includes(originalBlock)) {
    return { systemPrompt: systemPrompt.replace(originalBlock, desiredBlock) };
  }
  if (desiredBlock.length === 0) return { systemPrompt };

  const marker = "\nCurrent working directory:";
  const markerIndex = systemPrompt.lastIndexOf(marker);
  if (markerIndex < 0) {
    return { systemPrompt, error: "could not locate Pi's working-directory marker" };
  }
  return {
    systemPrompt: `${systemPrompt.slice(0, markerIndex)}${desiredBlock}${systemPrompt.slice(markerIndex)}`,
  };
}
