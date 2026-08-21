import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	formatSkillsForPrompt,
	type ExtensionAPI,
	type Skill,
} from "@earendil-works/pi-coding-agent";
import skillVisibilityExtension from "./index.ts";

interface RegisteredExtension {
	handler: (event: any, ctx: any) => Promise<{ systemPrompt: string }>;
	commandName: string;
	commandDescription: string;
	commandHandler: (args: string, ctx: any) => Promise<void>;
}

function registerExtension(): RegisteredExtension {
	let handler: RegisteredExtension["handler"] | undefined;
	let commandName: string | undefined;
	let commandDescription: string | undefined;
	let commandHandler: RegisteredExtension["commandHandler"] | undefined;
	const pi = {
		on(event: string, registered: RegisteredExtension["handler"]) {
			assert.equal(event, "before_agent_start");
			handler = registered;
		},
		registerCommand(
			name: string,
			options: {
				description: string;
				handler: RegisteredExtension["commandHandler"];
			},
		) {
			commandName = name;
			commandDescription = options.description;
			commandHandler = options.handler;
		},
	} as unknown as ExtensionAPI;
	skillVisibilityExtension(pi);
	assert.ok(handler);
	assert.ok(commandName);
	assert.ok(commandDescription);
	assert.ok(commandHandler);
	return { handler, commandName, commandDescription, commandHandler };
}

function skill(
	dir: string,
	name: string,
	filePath: string,
	disabled: boolean,
): Skill {
	return {
		name,
		description: name,
		filePath,
		baseDir: dir,
		sourceInfo: {
			path: filePath,
			source: "test",
			scope: "user",
			origin: "top-level",
		},
		disableModelInvocation: disabled,
	};
}

async function withAgentDir<T>(dir: string, run: () => Promise<T>): Promise<T> {
	const previous = process.env.PI_CODING_AGENT_DIR;
	process.env.PI_CODING_AGENT_DIR = dir;
	try {
		return await run();
	} finally {
		if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previous;
	}
}

test("before_agent_start loads registry overrides, enforces files, and filters the prompt", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-index-"));
	const debuggingPath = join(dir, "debugging.md");
	const wikiPath = join(dir, "wiki.md");
	await writeFile(
		debuggingPath,
		"---\nname: systematic-debugging\ndescription: Debug.\n---\n",
		"utf8",
	);
	await writeFile(
		wikiPath,
		"---\nname: wiki\ndescription: Wiki.\ndisable-model-invocation: true\n---\n",
		"utf8",
	);
	const canonicalDebuggingPath = await realpath(debuggingPath);
	const canonicalWikiPath = await realpath(wikiPath);
	await writeFile(
		join(dir, "skill-visibility.json"),
		`${JSON.stringify({
			version: 1,
			overrides: {
				[canonicalDebuggingPath]: "manual",
				[canonicalWikiPath]: "startup",
			},
		})}\n`,
		"utf8",
	);

	try {
		await withAgentDir(dir, async () => {
			const { handler, commandName, commandDescription } = registerExtension();
			assert.equal(commandName, "toggle-skills");
			assert.match(commandDescription, /Startup/);
			assert.match(commandDescription, /Manual/);
			const skills = [
				skill(dir, "systematic-debugging", debuggingPath, false),
				skill(dir, "wiki", wikiPath, true),
			];
			const originalPrompt = `Header${formatSkillsForPrompt(skills)}\nCurrent working directory: /repo`;
			const result = await handler(
				{
					systemPrompt: originalPrompt,
					systemPromptOptions: { skills, selectedTools: ["read"] },
				},
				{ ui: { notify() {} } },
			);

			assert.doesNotMatch(
				result.systemPrompt,
				/<name>systematic-debugging<\/name>/,
			);
			assert.match(result.systemPrompt, /<name>wiki<\/name>/);
			assert.match(
				await readFile(debuggingPath, "utf8"),
				/disable-model-invocation: true/,
			);
			assert.doesNotMatch(
				await readFile(wikiPath, "utf8"),
				/disable-model-invocation/,
			);
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("before_agent_start leaves the prompt unchanged without the read tool", async () => {
	const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-no-read-"));
	const wikiPath = join(dir, "wiki.md");
	await writeFile(
		wikiPath,
		"---\nname: wiki\ndescription: Wiki.\ndisable-model-invocation: true\n---\n",
		"utf8",
	);

	try {
		await withAgentDir(dir, async () => {
			const { handler } = registerExtension();
			const originalPrompt = "Header\nCurrent working directory: /repo";
			const result = await handler(
				{
					systemPrompt: originalPrompt,
					systemPromptOptions: {
						skills: [skill(dir, "wiki", wikiPath, true)],
						selectedTools: [],
					},
				},
				{ ui: { notify() {} } },
			);

			assert.equal(result.systemPrompt, originalPrompt);
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("registered command handler delegates to the toggle command", async () => {
	const { commandHandler } = registerExtension();
	const notifications: string[] = [];
	await commandHandler("", {
		hasUI: false,
		ui: {
			notify(message: string) {
				notifications.push(message);
			},
		},
	});
	assert.deepEqual(notifications, ["/toggle-skills requires interactive Pi"]);
});

test("malformed registry falls back to checked-in defaults without overwriting it", async () => {
	const dir = await mkdtemp(
		join(tmpdir(), "pi-skill-visibility-index-malformed-"),
	);
	const debuggingPath = join(dir, "debugging.md");
	const wikiPath = join(dir, "wiki.md");
	const registryPath = join(dir, "skill-visibility.json");
	const malformed = "{not-json\n";
	await writeFile(
		debuggingPath,
		"---\nname: systematic-debugging\ndescription: Debug.\ndisable-model-invocation: true\n---\n",
		"utf8",
	);
	await writeFile(
		wikiPath,
		"---\nname: wiki\ndescription: Wiki.\n---\n",
		"utf8",
	);
	await writeFile(registryPath, malformed, "utf8");

	try {
		await withAgentDir(dir, async () => {
			const { handler } = registerExtension();
			const skills = [
				skill(dir, "systematic-debugging", debuggingPath, true),
				skill(dir, "wiki", wikiPath, false),
			];
			const notifications: string[] = [];
			const originalPrompt = `Header${formatSkillsForPrompt(skills)}\nCurrent working directory: /repo`;
			const result = await handler(
				{
					systemPrompt: originalPrompt,
					systemPromptOptions: { skills, selectedTools: ["read"] },
				},
				{
					ui: {
						notify(message: string) {
							notifications.push(message);
						},
					},
				},
			);

			assert.match(result.systemPrompt, /<name>systematic-debugging<\/name>/);
			assert.doesNotMatch(result.systemPrompt, /<name>wiki<\/name>/);
			assert.doesNotMatch(
				await readFile(debuggingPath, "utf8"),
				/disable-model-invocation/,
			);
			assert.match(
				await readFile(wikiPath, "utf8"),
				/disable-model-invocation: true/,
			);
			assert.equal(await readFile(registryPath, "utf8"), malformed);
			assert.equal(notifications.length, 1);
			assert.match(
				notifications[0],
				/Skill visibility policy had 1 error\(s\)/,
			);
			assert.match(notifications[0], /Registry .*invalid JSON/);
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
