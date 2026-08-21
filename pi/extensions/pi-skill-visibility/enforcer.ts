import { realpath } from "node:fs/promises";
import { writeSkillVisibility } from "./frontmatter.ts";
import {
	resolveSkillInventory,
	type ResolvedSkill,
	type SkillIdentity,
	type VisibilityOverrides,
} from "./resolver.ts";

export type { SkillIdentity } from "./resolver.ts";
export type ResolvedProjection<T extends SkillIdentity = SkillIdentity> =
	ResolvedSkill<T>;

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
	writeVisibility(
		path: string,
		disabled: boolean,
		expectedFingerprint?: string,
	): Promise<{ changed: boolean }>;
}

const defaultDependencies: Dependencies = {
	realpath,
	writeVisibility: writeSkillVisibility,
};

export async function projectSkillVisibility<T extends SkillIdentity>(
	resolved: Array<ResolvedSkill<T>>,
	expectedFingerprints?: ReadonlyMap<string, string>,
	dependencies: Pick<Dependencies, "writeVisibility"> = defaultDependencies,
): Promise<EnforcementResult> {
	const changed: string[] = [];
	const errors: VisibilityError[] = [];

	for (const item of resolved) {
		const expectedFingerprint = expectedFingerprints?.get(item.canonicalPath);
		if (expectedFingerprints && expectedFingerprint === undefined) {
			errors.push({
				name: item.skill.name,
				path: item.skill.filePath,
				message: "selector-open content snapshot was unavailable",
			});
			continue;
		}

		try {
			const result = await dependencies.writeVisibility(
				item.canonicalPath,
				item.mode === "manual",
				expectedFingerprint,
			);
			if (result.changed) changed.push(item.skill.filePath);
		} catch (error) {
			errors.push({
				name: item.skill.name,
				path: item.skill.filePath,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return { resolved, changed, errors };
}

export async function enforceSkillVisibility(
	skills: SkillIdentity[],
	overrides: VisibilityOverrides,
	dependencies: Dependencies = defaultDependencies,
): Promise<EnforcementResult> {
	const inventory = await resolveSkillInventory(
		skills,
		overrides,
		dependencies.realpath,
	);
	const projected = await projectSkillVisibility(
		inventory.skills,
		undefined,
		dependencies,
	);
	return {
		resolved: inventory.skills,
		changed: projected.changed,
		errors: [...inventory.errors, ...projected.errors],
	};
}
