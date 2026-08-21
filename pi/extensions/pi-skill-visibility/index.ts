import {
	formatSkillsForPrompt,
	type ExtensionAPI,
	type Skill,
} from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import {
	readVisibilityRegistry,
	registryOverrides,
	visibilityRegistryPath,
} from "./registry.ts";
import type { VisibilityOverrides } from "./resolver.ts";
import { rewriteSkillPrompt } from "./prompt.ts";
import { runToggleSkillsCommand } from "./toggle-command.ts";

interface LoadedRegistry {
	overrides: VisibilityOverrides;
	error?: string;
}

export default function skillVisibilityExtension(pi: ExtensionAPI): void {
	const registryPath = visibilityRegistryPath();
	const registry: Promise<LoadedRegistry> = readVisibilityRegistry(registryPath)
		.then((value) => ({ overrides: registryOverrides(value) }))
		.catch((error) => ({
			overrides: {},
			error: bound(
				`Registry (${registryPath}): ${error instanceof Error ? error.message : String(error)}`,
			),
		}));
	let enforcement: Promise<EnforcementResult> | undefined;
	let warned = false;

	pi.registerCommand("toggle-skills", {
		description: "Choose Startup or Manual visibility for loaded skills",
		handler: async (_args, ctx) => {
			await runToggleSkillsCommand(ctx);
		},
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const skills = (event.systemPromptOptions.skills ?? []) as Skill[];
		const loadedRegistry = await registry;
		enforcement ??= enforceSkillVisibility(skills, loadedRegistry.overrides);
		const result = await enforcement;
		const modesByPath = new Map(
			result.resolved.map(({ skill, mode }) => [skill.filePath, mode]),
		);

		const hasReadTool =
			!event.systemPromptOptions.selectedTools ||
			event.systemPromptOptions.selectedTools.includes("read");
		const rewritten = hasReadTool
			? rewriteSkillPrompt({
					systemPrompt: event.systemPrompt,
					skills,
					modesByPath,
					formatter: formatSkillsForPrompt,
				})
			: { systemPrompt: event.systemPrompt };

		if (
			!warned &&
			(loadedRegistry.error || result.errors.length > 0 || rewritten.error)
		) {
			warned = true;
			const details = result.errors
				.slice(0, 3)
				.map((error) => `${error.name} (${error.path}): ${error.message}`);
			if (loadedRegistry.error) details.unshift(loadedRegistry.error);
			if (result.errors.length > 3)
				details.push(`… ${result.errors.length - 3} more`);
			if (rewritten.error) details.push(rewritten.error);
			const errorCount =
				result.errors.length +
				(loadedRegistry.error ? 1 : 0) +
				(rewritten.error ? 1 : 0);
			ctx.ui.notify(
				`Skill visibility policy had ${errorCount} error(s):\n${details.join("\n")}`,
				"warning",
			);
		}

		return { systemPrompt: rewritten.systemPrompt };
	});
}

function bound(message: string, maxLength = 300): string {
	return message.length <= maxLength
		? message
		: `${message.slice(0, maxLength - 1)}…`;
}
