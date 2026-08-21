import type { SkillVisibilityMode } from "./policy.ts";

export interface PromptSkill {
	name: string;
	filePath: string;
	disableModelInvocation: boolean;
}

type SkillFormatter<T extends PromptSkill> = (skills: T[]) => string;

export interface PromptRewriteOptions<T extends PromptSkill> {
	systemPrompt: string;
	skills: T[];
	modesByPath: ReadonlyMap<string, SkillVisibilityMode>;
	formatter: SkillFormatter<T>;
}

export interface PromptRewriteResult {
	systemPrompt: string;
	error?: string;
}

const workingDirectoryMarker = "\nCurrent working directory:";
const namedSkillsMarker = "[Skills]\n";
const xmlSkillsStartMarker = "<available_skills>";
const xmlSkillsEndMarker = "</available_skills>";
const xmlSkillsPreamble =
	"\n\nThe following skills provide specialized instructions for specific tasks.";

export function rewriteSkillPrompt<T extends PromptSkill>({
	systemPrompt,
	skills,
	modesByPath,
	formatter,
}: PromptRewriteOptions<T>): PromptRewriteResult {
	const startupSkills = skills.flatMap((skill) =>
		modesByPath.get(skill.filePath) === "startup"
			? [{ ...skill, disableModelInvocation: false } as T]
			: [],
	);
	const originalBlock = formatter(skills);
	const startupBlock = formatter(startupSkills);

	if (originalBlock.length > 0 && systemPrompt.includes(originalBlock)) {
		return { systemPrompt: systemPrompt.replace(originalBlock, startupBlock) };
	}

	const replaced = replaceExistingSkillSection(
		systemPrompt,
		startupBlock,
		startupSkills.map((skill) => skill.name),
	);
	if (replaced !== undefined) return { systemPrompt: replaced };
	if (startupBlock.length === 0) return { systemPrompt };

	const workingDirectoryIndex = systemPrompt.lastIndexOf(
		workingDirectoryMarker,
	);
	if (workingDirectoryIndex < 0) {
		return {
			systemPrompt,
			error: "could not locate Pi's working-directory marker",
		};
	}
	return {
		systemPrompt: `${systemPrompt.slice(0, workingDirectoryIndex)}${startupBlock}${systemPrompt.slice(workingDirectoryIndex)}`,
	};
}

function replaceExistingSkillSection(
	systemPrompt: string,
	startupBlock: string,
	startupNames: string[],
): string | undefined {
	const xmlStart = systemPrompt.indexOf(xmlSkillsStartMarker);
	const xmlEnd = systemPrompt.indexOf(xmlSkillsEndMarker, xmlStart);
	if (xmlStart >= 0 && xmlEnd >= xmlStart) {
		const preambleStart = systemPrompt.lastIndexOf(xmlSkillsPreamble, xmlStart);
		let sectionStart = preambleStart >= 0 ? preambleStart : xmlStart;
		while (sectionStart > 0 && systemPrompt[sectionStart - 1] === "\n") {
			sectionStart -= 1;
		}
		const sectionEnd = xmlEnd + xmlSkillsEndMarker.length;
		return replaceRange(systemPrompt, sectionStart, sectionEnd, startupBlock);
	}

	const namedStart = systemPrompt.indexOf(namedSkillsMarker);
	if (namedStart < 0) return undefined;

	const contentStart = namedStart + namedSkillsMarker.length;
	const blankLine = systemPrompt.indexOf("\n\n", contentStart);
	const workingDirectory = systemPrompt.lastIndexOf(workingDirectoryMarker);
	const boundaries = [
		blankLine >= 0 ? blankLine + 1 : systemPrompt.length,
		workingDirectory > namedStart ? workingDirectory : systemPrompt.length,
	];
	const namedEnd = Math.min(...boundaries);
	const namedBlock = `${namedSkillsMarker}  ${startupNames.join(", ")}\n`;
	return replaceRange(systemPrompt, namedStart, namedEnd, namedBlock);
}

function replaceRange(
	value: string,
	start: number,
	end: number,
	replacement: string,
): string {
	return `${value.slice(0, start)}${replacement}${value.slice(end)}`;
}
