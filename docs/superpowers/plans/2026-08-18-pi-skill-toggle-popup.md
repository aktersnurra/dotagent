# Pi Skill Toggle Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a searchable `/toggle-skills` popup that persists exact-installation Startup/Manual choices, supports Vim and Colemak-DH navigation, and reloads Pi immediately after saving.

**Architecture:** Keep the checked-in 28-skill allowlist as defaults, then layer a user-owned exact-path override registry over those defaults. Resolve Pi's canonical `Skill[]` inventory into effective modes, project those modes into skill frontmatter, rewrite the first-turn skills block, and expose a compact `ctx.ui.custom` popup whose save path writes the registry atomically before reloading Pi.

**Tech Stack:** TypeScript 5.9, Node.js 24 test runner, Pi extension API 0.84.2, `@earendil-works/pi-tui` 0.84.2, Jujutsu.

## Global Constraints

- The popup command is exactly `/toggle-skills`.
- Modes are exactly `startup` and `manual`; there is no Disabled mode.
- Startup skills enter model context and retain `/skill:<name>`.
- Manual skills stay out of model context and retain `/skill:<name>`.
- The existing 28-name allowlist remains the fallback default.
- Overrides are global and keyed by canonical absolute `SKILL.md` path.
- `ask-user` remains excluded through the existing package entry with `skills: []`.
- Save writes the registry atomically and calls `ctx.reload()` exactly once.
- Cancel and no-change save write nothing and do not reload.
- Normal mode supports Vim `j/k`, Colemak-DH `n/e`, `gg/G`, `/`, Space, `s`, `q`, and Esc.
- Search mode treats letters as text and exits with Enter or Esc.
- Arrow keys and Ctrl+S remain compatibility shortcuts.
- Preserve minimal frontmatter edits, unrelated bytes, and LF/CRLF endings.
- Continue after per-skill projection failures and emit one bounded summary.
- Use `jj` for every version-control operation.

---

## File Map

- Modify `pi/extensions/pi-skill-visibility/policy.ts` — expose Startup/Manual defaults instead of only a disable boolean.
- Modify `pi/extensions/pi-skill-visibility/policy.test.ts` — retain exact 28-name default coverage.
- Create `pi/extensions/pi-skill-visibility/resolver.ts` — canonicalize Pi skills, deduplicate exact installations, resolve precedence, and report path failures.
- Create `pi/extensions/pi-skill-visibility/resolver.test.ts` — precedence, canonical identity, and duplicate coverage.
- Create `pi/extensions/pi-skill-visibility/registry.ts` — registry schema, validation, path selection, minimal override construction, and atomic I/O.
- Create `pi/extensions/pi-skill-visibility/registry.test.ts` — missing/malformed registry, pruning, and atomic persistence coverage.
- Modify `pi/extensions/pi-skill-visibility/enforcer.ts` — project resolved modes instead of consulting the name allowlist directly.
- Modify `pi/extensions/pi-skill-visibility/enforcer.test.ts` — exact override and isolated failure coverage.
- Modify `pi/extensions/pi-skill-visibility/prompt.ts` — filter by resolved path mode.
- Modify `pi/extensions/pi-skill-visibility/prompt.test.ts` — duplicate-name and path-specific prompt coverage.
- Create `pi/extensions/pi-skill-visibility/toggle-model.ts` — popup rows, filtering, modal input, selection, and drafts.
- Create `pi/extensions/pi-skill-visibility/toggle-model.test.ts` — Vim/Colemak/search state-machine coverage.
- Create `pi/extensions/pi-skill-visibility/toggle-overlay.ts` — compact themed overlay rendering and `ctx.ui.custom` adapter.
- Create `pi/extensions/pi-skill-visibility/toggle-overlay.test.ts` — rendered labels and save-result adapter coverage.
- Create `pi/extensions/pi-skill-visibility/toggle-command.ts` — command orchestration, notifications, registry save, projection, and reload boundary.
- Create `pi/extensions/pi-skill-visibility/toggle-command.test.ts` — headless, cancel, no-change, malformed, apply, partial failure, and reload coverage.
- Modify `pi/extensions/pi-skill-visibility/index.ts` — register the command and load the registry for startup enforcement.
- Modify `pi/extensions/pi-skill-visibility/index.test.ts` — command registration and first-turn override integration.
- Modify `pi/extensions/pi-skill-visibility/package.json` — add `@earendil-works/pi-tui` peer/dev dependencies.
- Modify `pi/extensions/pi-skill-visibility/package-lock.json` — lock the direct TUI development dependency.
- Modify `tests/test_install_pi.sh` — prove reinstall does not create or overwrite the override registry.

### Task 1: Resolve Defaults and Exact Skill Installations

**Files:**

- Modify: `pi/extensions/pi-skill-visibility/policy.ts`
- Modify: `pi/extensions/pi-skill-visibility/policy.test.ts`
- Create: `pi/extensions/pi-skill-visibility/resolver.ts`
- Create: `pi/extensions/pi-skill-visibility/resolver.test.ts`

**Interfaces:**

- Produces: `SkillVisibilityMode = "startup" | "manual"`.
- Produces: `defaultSkillVisibility(name: string): SkillVisibilityMode`.
- Produces: `resolveSkillInventory<T extends SkillIdentity>(skills, overrides, canonicalize): Promise<ResolvedInventory<T>>`.
- Produces: `ResolvedSkill<T>` with `skill`, `canonicalPath`, `defaultMode`, and `mode`.
- Produces: `ResolvedInventory<T>` with `skills` and per-skill `errors`.

- [ ] **Step 1: Write failing policy and resolver tests**

Replace the policy assertions with mode assertions and add `resolver.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_VISIBLE_SKILL_NAMES,
  defaultSkillVisibility,
} from "./policy.ts";

const expectedAgentVisible = [
  "brainstorming",
  "context-mode",
  "design-doctrine",
  "dispatching-parallel-agents",
  "elixir",
  "executing-plans",
  "finishing-a-development-branch",
  "hegel",
  "jj",
  "mcp-scripting",
  "ocaml",
  "pi-lens-ast-grep",
  "pi-lens-lsp-navigation",
  "pi-subagents",
  "pire-browser",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "tiger-style",
  "type-driven-development",
  "ui-design",
  "using-jj-workspaces",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
  "writing-skills",
] as const;

test("checked-in Startup defaults match the approved 28 skills", () => {
  assert.deepEqual([...AGENT_VISIBLE_SKILL_NAMES].sort(), [...expectedAgentVisible].sort());
  assert.equal(AGENT_VISIBLE_SKILL_NAMES.size, 28);
  assert.equal(defaultSkillVisibility("systematic-debugging"), "startup");
  assert.equal(defaultSkillVisibility("wiki"), "manual");
  assert.equal(defaultSkillVisibility("new-package-skill"), "manual");
});
```

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveSkillInventory } from "./resolver.ts";

const skills = [
  { name: "wiki", filePath: "/links/wiki/SKILL.md" },
  { name: "wiki-copy", filePath: "/links/wiki-copy/SKILL.md" },
  { name: "jj", filePath: "/skills/jj/SKILL.md" },
];

test("exact-path override wins before name default", async () => {
  const result = await resolveSkillInventory(
    skills,
    { "/real/wiki/SKILL.md": "startup", "/skills/jj/SKILL.md": "manual" },
    async (path) => path.includes("wiki") ? "/real/wiki/SKILL.md" : path,
  );

  assert.deepEqual(result.skills.map(({ canonicalPath, defaultMode, mode }) => ({
    canonicalPath,
    defaultMode,
    mode,
  })), [
    { canonicalPath: "/real/wiki/SKILL.md", defaultMode: "manual", mode: "startup" },
    { canonicalPath: "/skills/jj/SKILL.md", defaultMode: "startup", mode: "manual" },
  ]);
  assert.deepEqual(result.errors, []);
});

test("canonicalization failures are isolated", async () => {
  const result = await resolveSkillInventory(skills.slice(0, 2), {}, async (path) => {
    if (path.includes("wiki-copy")) throw new Error("missing target");
    return path;
  });

  assert.equal(result.skills.length, 1);
  assert.deepEqual(result.errors, [{
    name: "wiki-copy",
    path: "/links/wiki-copy/SKILL.md",
    message: "missing target",
  }]);
});
```

- [ ] **Step 2: Run focused tests and verify the new API is missing**

Run:

```bash
cd pi/extensions/pi-skill-visibility
node --test policy.test.ts resolver.test.ts
```

Expected: FAIL because `defaultSkillVisibility` and `resolver.ts` do not exist.

- [ ] **Step 3: Implement mode defaults and resolver**

Keep the existing set literal in `policy.ts`, then replace the boolean helper with:

```ts
export type SkillVisibilityMode = "startup" | "manual";

export function defaultSkillVisibility(name: string): SkillVisibilityMode {
  return AGENT_VISIBLE_SKILL_NAMES.has(name) ? "startup" : "manual";
}

export function desiredDisableModelInvocation(name: string): boolean {
  return defaultSkillVisibility(name) === "manual";
}
```

Create `resolver.ts`:

```ts
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
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --test policy.test.ts resolver.test.ts
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit resolver foundation**

```bash
jj describe -m "feat(pi): resolve exact skill visibility"
jj new
```

### Task 2: Persist a Validated Override Registry

**Files:**

- Create: `pi/extensions/pi-skill-visibility/registry.ts`
- Create: `pi/extensions/pi-skill-visibility/registry.test.ts`

**Interfaces:**

- Consumes: `SkillVisibilityMode`, `ResolvedSkill`, and `VisibilityOverrides` from Task 1.
- Produces: `VisibilityRegistry { version: 1; overrides: Record<string, SkillVisibilityMode> }`.
- Produces: `RegistryValidationError`.
- Produces: `visibilityRegistryPath(agentDir?: string): string`.
- Produces: `readVisibilityRegistry(path): Promise<VisibilityRegistry>`.
- Produces: `writeVisibilityRegistry(path, registry): Promise<void>`.
- Produces: `buildSavedRegistry(skills, desiredModes): VisibilityRegistry`.

- [ ] **Step 1: Write failing registry tests**

Create `registry.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildSavedRegistry,
  parseVisibilityRegistry,
  readVisibilityRegistry,
  RegistryValidationError,
  writeVisibilityRegistry,
} from "./registry.ts";

const empty = { version: 1 as const, overrides: {} };

test("missing registry reads as version 1 with no overrides", async () => {
  assert.deepEqual(await readVisibilityRegistry("/definitely/missing/skill-visibility.json"), empty);
});

test("parser rejects malformed shape and mode", () => {
  assert.throws(() => parseVisibilityRegistry('{"version":2,"overrides":{}}'), RegistryValidationError);
  assert.throws(() => parseVisibilityRegistry('{"version":1,"overrides":{"relative.md":"manual"}}'), RegistryValidationError);
  assert.throws(() => parseVisibilityRegistry('{"version":1,"overrides":{"/x/SKILL.md":"disabled"}}'), RegistryValidationError);
});

test("saved registry keeps only non-default choices for current paths", () => {
  const skills = [
    {
      skill: { name: "jj", filePath: "/links/jj/SKILL.md" },
      canonicalPath: "/real/jj/SKILL.md",
      defaultMode: "startup" as const,
      mode: "manual" as const,
    },
    {
      skill: { name: "wiki", filePath: "/skills/wiki/SKILL.md" },
      canonicalPath: "/skills/wiki/SKILL.md",
      defaultMode: "manual" as const,
      mode: "manual" as const,
    },
  ];
  assert.deepEqual(buildSavedRegistry(skills, new Map<string, "startup" | "manual">([
    ["/real/jj/SKILL.md", "manual"],
    ["/skills/wiki/SKILL.md", "manual"],
    ["/stale/SKILL.md", "startup"],
  ])), {
    version: 1,
    overrides: { "/real/jj/SKILL.md": "manual" },
  });
});

test("writer replaces the registry atomically", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-registry-"));
  const path = join(dir, "skill-visibility.json");
  try {
    await writeFile(path, "old", "utf8");
    await writeVisibilityRegistry(path, {
      version: 1,
      overrides: { "/skills/wiki/SKILL.md": "startup" },
    });
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
      version: 1,
      overrides: { "/skills/wiki/SKILL.md": "startup" },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test registry.test.ts
```

Expected: FAIL because `registry.ts` does not exist.

- [ ] **Step 3: Implement registry parsing, minimal saves, and atomic I/O**

Create `registry.ts`:

```ts
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { SkillVisibilityMode } from "./policy.ts";
import type { ResolvedSkill, SkillIdentity, VisibilityOverrides } from "./resolver.ts";

export interface VisibilityRegistry {
  version: 1;
  overrides: Record<string, SkillVisibilityMode>;
}

export class RegistryValidationError extends Error {}

export function visibilityRegistryPath(
  agentDir = process.env.PI_CODING_AGENT_DIR?.trim() || join(homedir(), ".pi", "agent"),
): string {
  return join(agentDir, "skill-visibility.json");
}

export function parseVisibilityRegistry(raw: string): VisibilityRegistry {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new RegistryValidationError(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistryValidationError("registry must be an object");
  }
  const candidate = value as { version?: unknown; overrides?: unknown };
  if (candidate.version !== 1) throw new RegistryValidationError("registry version must be 1");
  if (!candidate.overrides || typeof candidate.overrides !== "object" || Array.isArray(candidate.overrides)) {
    throw new RegistryValidationError("registry overrides must be an object");
  }
  const overrides: Record<string, SkillVisibilityMode> = {};
  for (const [path, mode] of Object.entries(candidate.overrides)) {
    if (!isAbsolute(path)) throw new RegistryValidationError(`override path must be absolute: ${path}`);
    if (mode !== "startup" && mode !== "manual") {
      throw new RegistryValidationError(`invalid mode for ${path}`);
    }
    overrides[path] = mode;
  }
  return { version: 1, overrides };
}

export async function readVisibilityRegistry(path: string): Promise<VisibilityRegistry> {
  try {
    return parseVisibilityRegistry(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, overrides: {} };
    throw error;
  }
}

export function buildSavedRegistry<T extends SkillIdentity>(
  skills: Array<ResolvedSkill<T>>,
  desiredModes: ReadonlyMap<string, SkillVisibilityMode>,
): VisibilityRegistry {
  const overrides: Record<string, SkillVisibilityMode> = {};
  for (const skill of skills) {
    const desired = desiredModes.get(skill.canonicalPath) ?? skill.mode;
    if (desired !== skill.defaultMode) overrides[skill.canonicalPath] = desired;
  }
  return { version: 1, overrides };
}

export async function writeVisibilityRegistry(path: string, registry: VisibilityRegistry): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    await rename(tempPath, path);
  } finally {
    await rm(tempPath, { force: true });
  }
}

export function registryOverrides(registry: VisibilityRegistry): VisibilityOverrides {
  return registry.overrides;
}
```

- [ ] **Step 4: Run registry and resolver tests**

Run:

```bash
node --test registry.test.ts resolver.test.ts
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Commit durable registry support**

```bash
jj describe -m "feat(pi): persist skill visibility overrides"
jj new
```

### Task 3: Enforce Resolved Modes in Files and the First Prompt

**Files:**

- Modify: `pi/extensions/pi-skill-visibility/enforcer.ts`
- Modify: `pi/extensions/pi-skill-visibility/enforcer.test.ts`
- Modify: `pi/extensions/pi-skill-visibility/prompt.ts`
- Modify: `pi/extensions/pi-skill-visibility/prompt.test.ts`

**Interfaces:**

- Consumes: `resolveSkillInventory`, `VisibilityOverrides`, and `ResolvedSkill` from Task 1.
- Produces: `enforceSkillVisibility(skills, overrides, dependencies): Promise<EnforcementResult>`.
- `EnforcementResult` includes `resolved`, `changed`, and `errors`.
- Produces: `rewriteSkillPrompt(systemPrompt, skills, modesByPath, formatter, includeSkills)`.

- [ ] **Step 1: Rewrite enforcer tests around exact-path overrides**

Use these assertions in `enforcer.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { enforceSkillVisibility, type SkillIdentity } from "./enforcer.ts";

const skills: SkillIdentity[] = [
  { name: "systematic-debugging", filePath: "/skills/debug/SKILL.md" },
  { name: "ctx-purge", filePath: "/skills/purge/SKILL.md" },
  { name: "ctx-purge-copy", filePath: "/skills/purge-link/SKILL.md" },
];

test("deduplicates canonical paths and projects resolved overrides", async () => {
  const writes: Array<[string, boolean]> = [];
  const result = await enforceSkillVisibility(
    skills,
    { "/real/purge/SKILL.md": "startup", "/skills/debug/SKILL.md": "manual" },
    {
      realpath: async (path) => path.includes("purge") ? "/real/purge/SKILL.md" : path,
      writeVisibility: async (path, disabled) => {
        writes.push([path, disabled]);
        return { changed: true };
      },
    },
  );

  assert.deepEqual(writes, [
    ["/skills/debug/SKILL.md", true],
    ["/real/purge/SKILL.md", false],
  ]);
  assert.deepEqual(result.resolved.map((item) => item.mode), ["manual", "startup"]);
  assert.deepEqual(result.errors, []);
});

test("continues after canonicalization and projection failures", async () => {
  const result = await enforceSkillVisibility(skills.slice(0, 2), {}, {
    realpath: async (path) => {
      if (path.includes("debug")) throw new Error("broken link");
      return path;
    },
    writeVisibility: async () => { throw new Error("read-only file system"); },
  });
  assert.equal(result.resolved.length, 1);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.errors.map((error) => error.message), ["broken link", "read-only file system"]);
});
```

- [ ] **Step 2: Rewrite prompt tests around path-specific modes**

In `prompt.test.ts`, use two same-name skills with different paths:

```ts
const skills: PromptSkill[] = [
  { name: "duplicate", filePath: "/a/SKILL.md", disableModelInvocation: false },
  { name: "duplicate", filePath: "/b/SKILL.md", disableModelInvocation: false },
];
const modes = new Map([
  ["/a/SKILL.md", "startup" as const],
  ["/b/SKILL.md", "manual" as const],
]);

const format = (items: PromptSkill[]) => {
  const paths = items.filter((item) => !item.disableModelInvocation).map((item) => item.filePath);
  return paths.length === 0 ? "" : `\n<available_skills>${paths.join(",")}</available_skills>\n`;
};

test("rewrites duplicate names by exact path mode", () => {
  const original = `Header${format(skills)}\nCurrent working directory: /repo`;
  const result = rewriteSkillPrompt(original, skills, modes, format);
  assert.equal(result.systemPrompt, `Header${format([{ ...skills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("inserts Startup skills when source files were Manual", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  const result = rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    modes,
    format,
  );
  assert.equal(result.systemPrompt, `Header${format([{ ...manualSkills[0]!, disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("does not insert skills when the read tool is disabled", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    modes,
    format,
    false,
  ), { systemPrompt: "Header\nCurrent working directory: /repo" });
});

test("returns a diagnostic instead of guessing at an unknown prompt shape", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt("Custom prompt", manualSkills, modes, format), {
    systemPrompt: "Custom prompt",
    error: "could not locate Pi's working-directory marker",
  });
});
```

- [ ] **Step 3: Run focused tests and verify signature failures**

Run:

```bash
node --test enforcer.test.ts prompt.test.ts
```

Expected: FAIL because the existing functions still accept name-only policy inputs.

- [ ] **Step 4: Implement resolved enforcement**

Replace the policy lookup inside `enforcer.ts` with the resolver:

```ts
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
```

- [ ] **Step 5: Implement path-mode prompt rewriting**

Change `PromptSkill` and the function argument in `prompt.ts`:

```ts
import type { SkillVisibilityMode } from "./policy.ts";

export interface PromptSkill {
  name: string;
  filePath: string;
  disableModelInvocation: boolean;
}

export function rewriteSkillPrompt<T extends PromptSkill>(
  systemPrompt: string,
  skills: T[],
  modesByPath: ReadonlyMap<string, SkillVisibilityMode>,
  formatter: (skills: T[]) => string,
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
```

- [ ] **Step 6: Run all policy, resolver, registry, enforcer, frontmatter, and prompt tests**

Run:

```bash
node --test policy.test.ts resolver.test.ts registry.test.ts enforcer.test.ts frontmatter.test.ts prompt.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit registry-backed enforcement**

```bash
jj describe -m "feat(pi): enforce saved skill visibility"
jj new
```

### Task 4: Build the Vim/Colemak Popup State Machine

**Files:**

- Create: `pi/extensions/pi-skill-visibility/toggle-model.ts`
- Create: `pi/extensions/pi-skill-visibility/toggle-model.test.ts`
- Modify: `pi/extensions/pi-skill-visibility/package.json`
- Modify: `pi/extensions/pi-skill-visibility/package-lock.json`

**Interfaces:**

- Consumes: `SkillVisibilityMode`.
- Produces: `ToggleRow`, `ToggleDraft`, and `ToggleEffect`.
- Produces: `ToggleModel` with `handleInput`, `visibleRows`, `selectedRow`, `drafts`, and `changedCount`.

- [ ] **Step 1: Add the direct Pi TUI dependency**

Run:

```bash
cd pi/extensions/pi-skill-visibility
npm pkg set 'peerDependencies.@earendil-works/pi-tui=*'
npm install --save-dev --save-exact @earendil-works/pi-tui@0.84.2
```

Expected: `package.json` and `package-lock.json` list the direct peer/dev dependency at the requested ranges.

- [ ] **Step 2: Write failing state-machine tests**

Create `toggle-model.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { Key } from "@earendil-works/pi-tui";
import { ToggleModel, type ToggleRow } from "./toggle-model.ts";

const rows: ToggleRow[] = [
  { id: "/a/SKILL.md", name: "alpha", description: "First", sourceLabel: "Local", savedMode: "startup" },
  { id: "/b/SKILL.md", name: "beta", description: "Second", sourceLabel: "npm:beta", savedMode: "manual" },
  { id: "/c/SKILL.md", name: "charlie", description: "Third", sourceLabel: "Project", savedMode: "manual" },
];

test("Vim and Colemak-DH keys navigate only in Normal mode", () => {
  const model = new ToggleModel(rows);
  assert.equal(model.selectedRow()?.name, "alpha");
  model.handleInput("j");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("n");
  assert.equal(model.selectedRow()?.name, "charlie");
  model.handleInput("e");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("k");
  assert.equal(model.selectedRow()?.name, "alpha");
});

test("gg and G jump to list bounds", () => {
  const model = new ToggleModel(rows);
  model.handleInput("G");
  assert.equal(model.selectedRow()?.name, "charlie");
  model.handleInput("g");
  model.handleInput("g");
  assert.equal(model.selectedRow()?.name, "alpha");
});

test("Search mode accepts navigation letters as text", () => {
  const model = new ToggleModel(rows);
  model.handleInput("/");
  model.handleInput("b");
  model.handleInput("e");
  assert.equal(model.mode, "search");
  assert.equal(model.query, "be");
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput("\r");
  assert.equal(model.mode, "normal");
});

test("Space toggles and save/cancel return effects", () => {
  const model = new ToggleModel(rows);
  assert.equal(model.handleInput(" "), "render");
  assert.deepEqual(model.drafts().find((draft) => draft.id === "/a/SKILL.md"), {
    id: "/a/SKILL.md",
    desiredMode: "manual",
  });
  assert.equal(model.changedCount(), 1);
  assert.equal(model.handleInput("s"), "save");
  assert.equal(new ToggleModel(rows).handleInput("q"), "cancel");
});

test("arrow keys and Ctrl+S remain compatibility shortcuts", () => {
  const model = new ToggleModel(rows);
  model.handleInput(Key.down);
  assert.equal(model.selectedRow()?.name, "beta");
  model.handleInput(Key.up);
  assert.equal(model.selectedRow()?.name, "alpha");
  assert.equal(model.handleInput(Key.ctrl("s")), "save");
});

test("Esc exits Search mode before it cancels Normal mode", () => {
  const model = new ToggleModel(rows);
  model.handleInput("/");
  model.handleInput("b");
  assert.equal(model.handleInput(Key.escape), "render");
  assert.equal(model.mode, "normal");
  assert.equal(model.handleInput(Key.escape), "cancel");
});

test("Backspace updates search, empty matches are safe, and selection clamps", () => {
  const model = new ToggleModel(rows);
  model.handleInput("G");
  model.handleInput("/");
  for (const character of "alpha") model.handleInput(character);
  assert.equal(model.selectedRow()?.name, "alpha");
  for (let index = 0; index < 5; index += 1) model.handleInput(Key.backspace);
  for (const character of "missing") model.handleInput(character);
  assert.equal(model.visibleRows().length, 0);
  assert.equal(model.selectedRow(), undefined);
});
```

- [ ] **Step 3: Run the state-machine test and verify it fails**

Run:

```bash
node --test toggle-model.test.ts
```

Expected: FAIL because `toggle-model.ts` does not exist.

- [ ] **Step 4: Implement the modal state machine**

Create `toggle-model.ts`:

```ts
import { Key, matchesKey } from "@earendil-works/pi-tui";
import type { SkillVisibilityMode } from "./policy.ts";

export interface ToggleRow {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  savedMode: SkillVisibilityMode;
}

export interface ToggleDraft {
  id: string;
  desiredMode: SkillVisibilityMode;
}

export type ToggleEffect = "render" | "save" | "cancel" | undefined;
export type ToggleInputMode = "normal" | "search";

export class ToggleModel {
  public mode: ToggleInputMode = "normal";
  public query = "";
  private selectedIndex = 0;
  private pendingG = false;
  private readonly desired = new Map<string, SkillVisibilityMode>();

  constructor(private readonly rows: ToggleRow[]) {
    for (const row of rows) this.desired.set(row.id, row.savedMode);
  }

  handleInput(data: string): ToggleEffect {
    if (this.mode === "search") return this.handleSearchInput(data);

    if (matchesKey(data, Key.escape) || data === "q") return "cancel";
    if (matchesKey(data, Key.ctrl("s")) || data === "s") return "save";
    if (data === "/") {
      this.mode = "search";
      this.pendingG = false;
      return "render";
    }
    if (data === "G") {
      this.selectedIndex = Math.max(0, this.visibleRows().length - 1);
      this.pendingG = false;
      return "render";
    }
    if (data === "g") {
      if (this.pendingG) {
        this.selectedIndex = 0;
        this.pendingG = false;
        return "render";
      }
      this.pendingG = true;
      return undefined;
    }
    this.pendingG = false;

    if (matchesKey(data, Key.down) || data === "j" || data === "n") {
      this.move(1);
      return "render";
    }
    if (matchesKey(data, Key.up) || data === "k" || data === "e") {
      this.move(-1);
      return "render";
    }
    if (matchesKey(data, Key.space)) {
      const row = this.selectedRow();
      if (!row) return undefined;
      this.desired.set(row.id, this.modeFor(row) === "startup" ? "manual" : "startup");
      return "render";
    }
    return undefined;
  }

  visibleRows(): ToggleRow[] {
    const tokens = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const visible = tokens.length === 0 ? this.rows : this.rows.filter((row) => {
      const text = [row.name, row.description, row.sourceLabel, row.id, this.modeFor(row)].join(" ").toLowerCase();
      return tokens.every((token) => text.includes(token));
    });
    this.selectedIndex = clamp(this.selectedIndex, 0, Math.max(0, visible.length - 1));
    return visible;
  }

  selectedRow(): ToggleRow | undefined {
    return this.visibleRows()[this.selectedIndex];
  }

  modeFor(row: ToggleRow): SkillVisibilityMode {
    return this.desired.get(row.id) ?? row.savedMode;
  }

  drafts(): ToggleDraft[] {
    return this.rows.map((row) => ({ id: row.id, desiredMode: this.modeFor(row) }));
  }

  changedCount(): number {
    return this.rows.filter((row) => this.modeFor(row) !== row.savedMode).length;
  }

  private handleSearchInput(data: string): ToggleEffect {
    if (matchesKey(data, Key.enter)) {
      this.mode = "normal";
      return "render";
    }
    if (matchesKey(data, Key.escape)) {
      this.mode = "normal";
      return "render";
    }
    if (matchesKey(data, Key.backspace)) {
      this.query = Array.from(this.query).slice(0, -1).join("");
      this.selectedIndex = 0;
      return "render";
    }
    if (isPrintableInput(data)) {
      this.query += data;
      this.selectedIndex = 0;
      return "render";
    }
    return undefined;
  }

  private move(delta: number): void {
    const count = this.visibleRows().length;
    if (count === 0) return;
    this.selectedIndex = clamp(this.selectedIndex + delta, 0, count - 1);
  }
}

function isPrintableInput(data: string): boolean {
  return data.length > 0 && !data.includes("\x1b") && !data.includes("\r") && !data.includes("\n") && data >= " ";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

- [ ] **Step 5: Run state-machine tests and typecheck**

Run:

```bash
node --test toggle-model.test.ts
npm run typecheck
```

Expected: all model tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit keyboard and model behavior**

```bash
jj describe -m "feat(pi): model skill toggle interactions"
jj new
```

### Task 5: Render the Compact Popup

**Files:**

- Create: `pi/extensions/pi-skill-visibility/toggle-overlay.ts`
- Create: `pi/extensions/pi-skill-visibility/toggle-overlay.test.ts`

**Interfaces:**

- Consumes: `ToggleModel`, `ToggleRow`, `ToggleDraft`, and `ToggleEffect` from Task 4.
- Produces: `SkillToggleUiResult { action: "apply" | "cancel"; drafts: ToggleDraft[] }`.
- Produces: `showSkillToggleUi(ctx, rows): Promise<SkillToggleUiResult>`.

- [ ] **Step 1: Write a failing overlay adapter test**

Create `toggle-overlay.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { showSkillToggleUi } from "./toggle-overlay.ts";

const rows = [{
  id: "/skills/wiki/SKILL.md",
  name: "wiki",
  description: "Capture knowledge",
  sourceLabel: "Local",
  savedMode: "startup" as const,
}];

test("renders compact labels and returns changed drafts on save", async () => {
  let rendered: string[] = [];
  let renders = 0;
  const result = await showSkillToggleUi({
    ui: {
      custom: async (factory: any) => new Promise((resolve) => {
        const component = factory(
          { terminal: { rows: 24 }, requestRender: () => { renders += 1; } },
          { fg: (_color: string, text: string) => text, bold: (text: string) => text },
          {},
          resolve,
        );
        rendered = component.render(90);
        component.handleInput(" ");
        component.handleInput("s");
      }),
    },
  } as any, rows);

  assert.match(rendered.join("\n"), /Skill visibility/);
  assert.match(rendered.join("\n"), /wiki/);
  assert.match(rendered.join("\n"), /STARTUP/);
  assert.match(rendered.join("\n"), /j\/n down/);
  assert.equal(renders, 1);
  assert.deepEqual(result, {
    action: "apply",
    drafts: [{ id: "/skills/wiki/SKILL.md", desiredMode: "manual" }],
  });
});
```

- [ ] **Step 2: Run the overlay test and verify the module is missing**

Run:

```bash
node --test toggle-overlay.test.ts
```

Expected: FAIL because `toggle-overlay.ts` does not exist.

- [ ] **Step 3: Implement the compact overlay adapter**

Create `toggle-overlay.ts` with the approved single-list layout:

```ts
import type { ExtensionCommandContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { ToggleModel, type ToggleDraft, type ToggleRow } from "./toggle-model.ts";

export interface SkillToggleUiResult {
  action: "apply" | "cancel";
  drafts: ToggleDraft[];
}

export function showSkillToggleUi(
  ctx: ExtensionCommandContext,
  rows: ToggleRow[],
): Promise<SkillToggleUiResult> {
  return ctx.ui.custom<SkillToggleUiResult>(
    (tui, theme, _keybindings, done) => new SkillToggleOverlay(tui, theme, rows, done),
    {
      overlay: true,
      overlayOptions: { anchor: "center", width: "82%", maxHeight: "86%", minWidth: 72 },
    },
  );
}

class SkillToggleOverlay {
  private readonly model: ToggleModel;

  constructor(
    private readonly tui: TUI,
    private readonly theme: Theme,
    rows: ToggleRow[],
    private readonly done: (result: SkillToggleUiResult) => void,
  ) {
    this.model = new ToggleModel(rows);
  }

  handleInput(data: string): void {
    const effect = this.model.handleInput(data);
    if (effect === "save") {
      this.done({ action: "apply", drafts: this.model.drafts() });
      return;
    }
    if (effect === "cancel") {
      this.done({ action: "cancel", drafts: this.model.drafts() });
      return;
    }
    if (effect === "render") this.tui.requestRender();
  }

  render(width: number): string[] {
    const innerWidth = Math.max(32, width - 2);
    const height = clamp(Math.floor((this.tui.terminal.rows ?? 30) * 0.78), 14, 42);
    const bodyHeight = Math.max(6, height - 7);
    const header = this.header(innerWidth);
    const search = this.model.mode === "search"
      ? this.theme.fg("accent", `Search: ${this.model.query}▏`)
      : this.theme.fg("muted", `Search: ${this.model.query || "press /"}`);
    const body = this.rows(innerWidth, bodyHeight);
    const footer = this.theme.fg("dim", "j/n down · k/e up · gg/G jump · / search · space toggle · s save · q quit");

    return [
      this.theme.fg("borderAccent", `┌${"─".repeat(innerWidth)}┐`),
      frame(this.theme, header, innerWidth),
      frame(this.theme, search, innerWidth),
      this.theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`),
      ...body.map((line) => frame(this.theme, line, innerWidth)),
      this.theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`),
      frame(this.theme, footer, innerWidth),
      this.theme.fg("borderAccent", `└${"─".repeat(innerWidth)}┘`),
    ];
  }

  invalidate(): void {}

  private header(width: number): string {
    const title = this.theme.fg("accent", this.theme.bold("Skill visibility"));
    const summary = this.theme.fg("muted", `${this.model.drafts().length} skills · ${this.model.changedCount()} changed`);
    return `${title}${" ".repeat(Math.max(1, width - visibleWidth(title) - visibleWidth(summary)))}${summary}`;
  }

  private rows(width: number, height: number): string[] {
    const visible = this.model.visibleRows();
    const selected = this.model.selectedRow();
    if (visible.length === 0) return pad([this.theme.fg("dim", "No matching skills")], height);

    const selectedIndex = selected ? visible.findIndex((row) => row.id === selected.id) : 0;
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(height / 2), Math.max(0, visible.length - height)));
    const slice = visible.slice(start, start + height);
    const lines = slice.map((row) => {
      const current = this.model.modeFor(row);
      const changed = current !== row.savedMode ? this.theme.fg("accent", " *") : "";
      const marker = row.id === selected?.id ? "›" : " ";
      const label = `${marker} ${row.name}${changed}`;
      const source = this.theme.fg("dim", ` — ${row.sourceLabel}`);
      const status = current === "startup"
        ? this.theme.fg("accent", "STARTUP")
        : this.theme.fg("muted", "MANUAL");
      const left = `${label}${source}`;
      const gap = Math.max(1, width - visibleWidth(left) - visibleWidth(status));
      const line = `${left}${" ".repeat(gap)}${status}`;
      return row.id === selected?.id
        ? this.theme.fg("accent", this.theme.bold(fit(line, width)))
        : fit(line, width);
    });
    return pad(lines, height);
  }
}

function frame(theme: Theme, content: string, width: number): string {
  return `${theme.fg("borderAccent", "│")}${fit(content, width)}${theme.fg("borderAccent", "│")}`;
}

function fit(text: string, width: number): string {
  const truncated = truncateToWidth(text, Math.max(0, width));
  return `${truncated}${" ".repeat(Math.max(0, width - visibleWidth(truncated)))}`;
}

function pad(lines: string[], height: number): string[] {
  const result = [...lines];
  while (result.length < height) result.push("");
  return result.slice(0, height);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

- [ ] **Step 4: Run overlay, model, and type checks**

Run:

```bash
node --test toggle-overlay.test.ts toggle-model.test.ts
npm run typecheck
```

Expected: overlay and model tests pass, and TypeScript exits 0.

- [ ] **Step 5: Commit compact overlay rendering**

```bash
jj describe -m "feat(pi): render skill toggle popup"
jj new
```

### Task 6: Orchestrate Save, Projection, and Reload

**Files:**

- Create: `pi/extensions/pi-skill-visibility/toggle-command.ts`
- Create: `pi/extensions/pi-skill-visibility/toggle-command.test.ts`

**Interfaces:**

- Consumes: Pi `Skill[]`, registry I/O, resolver, enforcer, and popup adapter.
- Produces: `runToggleSkillsCommand(ctx, dependencies?): Promise<void>`.
- The function treats `await ctx.reload()` as terminal.

- [ ] **Step 1: Write failing command tests**

Create dependency-driven tests in `toggle-command.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { Skill } from "@earendil-works/pi-coding-agent";
import { runToggleSkillsCommand, type ToggleCommandDependencies } from "./toggle-command.ts";

const skill = (name: string, filePath: string): Skill => ({
  name,
  description: `${name} description`,
  filePath,
  baseDir: filePath.replace(/\/SKILL\.md$/, ""),
  sourceInfo: { path: filePath, source: "test-package", scope: "user", origin: "package" },
  disableModelInvocation: false,
});

function context(skills: Skill[], hasUI = true) {
  const notices: Array<[string, string]> = [];
  let reloads = 0;
  return {
    ctx: {
      hasUI,
      cwd: "/repo",
      getSystemPromptOptions: () => ({ skills }),
      ui: { notify: (message: string, level: string) => notices.push([message, level]) },
      reload: async () => { reloads += 1; },
    } as any,
    notices,
    reloads: () => reloads,
  };
}

function dependencies(
  overrides: Partial<ToggleCommandDependencies> = {},
): ToggleCommandDependencies {
  return {
    registryPath: () => "/agent/skill-visibility.json",
    readRegistry: async () => ({ version: 1, overrides: {} }),
    writeRegistry: async () => {},
    resolve: async (skills) => ({
      skills: skills.map((item) => ({
        skill: item,
        canonicalPath: item.filePath,
        defaultMode: "manual",
        mode: "manual",
      })),
      errors: [],
    }),
    enforce: async () => ({ resolved: [], changed: [], errors: [] }),
    showUi: async () => ({ action: "cancel", drafts: [] }),
    ...overrides,
  };
}

test("headless command returns without opening the popup", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")], false);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /requires interactive Pi/);
});

test("cancel and no-change save do not write or reload", async () => {
  for (const action of ["cancel", "apply"] as const) {
    const state = context([skill("wiki", "/wiki/SKILL.md")]);
    let writes = 0;
    await runToggleSkillsCommand(state.ctx, dependencies({
      showUi: async (_ctx, rows) => ({
        action,
        drafts: rows.map((row) => ({ id: row.id, desiredMode: row.savedMode })),
      }),
      writeRegistry: async () => { writes += 1; },
    }));
    assert.equal(writes, 0);
    assert.equal(state.reloads(), 0);
  }
});

test("apply writes minimal registry, projects, notifies, and reloads once", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  const events: string[] = [];
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    writeRegistry: async (_path, registry) => {
      events.push("write");
      assert.deepEqual(registry.overrides, { "/wiki/SKILL.md": "startup" });
    },
    enforce: async () => {
      events.push("enforce");
      return { resolved: [], changed: ["/wiki/SKILL.md"], errors: [] };
    },
  }));
  assert.deepEqual(events, ["write", "enforce"]);
  assert.equal(state.reloads(), 1);
  assert.match(state.notices.at(-1)?.[0] ?? "", /1 change/);
});

test("empty inventory notifies without opening UI", async () => {
  const state = context([]);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /No skills found/);
});

test("malformed registry stops before UI", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  let opened = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    readRegistry: async () => { throw new Error("registry version must be 1"); },
    showUi: async () => { opened = true; return { action: "cancel", drafts: [] }; },
  }));
  assert.equal(opened, false);
  assert.match(state.notices[0]?.[0] ?? "", /registry version must be 1/);
});

test("registry write failure prevents projection and reload", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  let projected = false;
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    writeRegistry: async () => { throw new Error("permission denied"); },
    enforce: async () => {
      projected = true;
      return { resolved: [], changed: [], errors: [] };
    },
  }));
  assert.equal(projected, false);
  assert.equal(state.reloads(), 0);
});

test("canonicalization errors are summarized when no usable skills remain", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  await runToggleSkillsCommand(state.ctx, dependencies({
    resolve: async () => ({
      skills: [],
      errors: [{ name: "wiki", path: "/wiki/SKILL.md", message: "broken link" }],
    }),
  }));
  assert.match(state.notices[0]?.[0] ?? "", /broken link/);
  assert.equal(state.reloads(), 0);
});

test("projection errors still reload after the registry was saved", async () => {
  const state = context([skill("wiki", "/wiki/SKILL.md")]);
  await runToggleSkillsCommand(state.ctx, dependencies({
    showUi: async (_ctx, rows) => ({
      action: "apply",
      drafts: [{ id: rows[0]!.id, desiredMode: "startup" }],
    }),
    enforce: async () => ({
      resolved: [],
      changed: [],
      errors: [{ name: "wiki", path: "/wiki/SKILL.md", message: "read-only" }],
    }),
  }));
  assert.equal(state.reloads(), 1);
  assert.match(state.notices.at(-1)?.[0] ?? "", /read-only/);
});
```

- [ ] **Step 2: Run command tests and verify the module is missing**

Run:

```bash
node --test toggle-command.test.ts
```

Expected: FAIL because `toggle-command.ts` does not exist.

- [ ] **Step 3: Implement command orchestration**

Create `toggle-command.ts`:

```ts
import type { ExtensionCommandContext, Skill } from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import {
  buildSavedRegistry,
  readVisibilityRegistry,
  visibilityRegistryPath,
  writeVisibilityRegistry,
  type VisibilityRegistry,
} from "./registry.ts";
import { resolveSkillInventory, type ResolvedInventory } from "./resolver.ts";
import { showSkillToggleUi, type SkillToggleUiResult } from "./toggle-overlay.ts";
import type { ToggleRow } from "./toggle-model.ts";

export interface ToggleCommandDependencies {
  registryPath(): string;
  readRegistry(path: string): Promise<VisibilityRegistry>;
  writeRegistry(path: string, registry: VisibilityRegistry): Promise<void>;
  resolve(skills: Skill[], overrides: VisibilityRegistry["overrides"]): Promise<ResolvedInventory<Skill>>;
  enforce(skills: Skill[], overrides: VisibilityRegistry["overrides"]): Promise<EnforcementResult>;
  showUi(ctx: ExtensionCommandContext, rows: ToggleRow[]): Promise<SkillToggleUiResult>;
}

const defaultDependencies: ToggleCommandDependencies = {
  registryPath: visibilityRegistryPath,
  readRegistry: readVisibilityRegistry,
  writeRegistry: writeVisibilityRegistry,
  resolve: resolveSkillInventory,
  enforce: enforceSkillVisibility,
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

  const rows = inventory.skills.map((item): ToggleRow => ({
    id: item.canonicalPath,
    name: item.skill.name,
    description: item.skill.description,
    sourceLabel: sourceLabel(item.skill),
    savedMode: item.mode,
  }));
  const result = await dependencies.showUi(ctx, rows);
  if (result.action === "cancel") return;

  const changed = result.drafts.filter((draft) => {
    const row = rows.find((candidate) => candidate.id === draft.id);
    return row && row.savedMode !== draft.desiredMode;
  });
  if (changed.length === 0) {
    ctx.ui.notify("No skill visibility changes", "info");
    return;
  }

  const desired = new Map(result.drafts.map((draft) => [draft.id, draft.desiredMode]));
  const saved = buildSavedRegistry(inventory.skills, desired);
  try {
    await dependencies.writeRegistry(path, saved);
  } catch (error) {
    ctx.ui.notify(`Could not save skill visibility registry at ${path}: ${message(error)}`, "error");
    return;
  }

  const enforcement = await dependencies.enforce(skills, saved.overrides);
  ctx.ui.notify(formatApplyResult(changed.length, enforcement), enforcement.errors.length ? "warning" : "info");
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
  const lines = [`Applied ${changes} skill visibility change${changes === 1 ? "" : "s"}.`];
  if (result.errors.length) {
    lines.push(`${result.errors.length} file projection${result.errors.length === 1 ? "" : "s"} skipped.`);
    for (const error of result.errors.slice(0, 3)) lines.push(`- ${error.name}: ${error.message}`);
    if (result.errors.length > 3) lines.push(`- … ${result.errors.length - 3} more`);
  }
  lines.push("Reloading Pi resources.");
  return lines.join("\n");
}

function formatErrors(prefix: string, errors: Array<{ name: string; message: string }>): string {
  return [prefix, ...errors.slice(0, 3).map((error) => `- ${error.name}: ${error.message}`)].join("\n");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

- [ ] **Step 4: Run command, model, registry, and resolver tests**

Run:

```bash
node --test toggle-command.test.ts toggle-model.test.ts registry.test.ts resolver.test.ts
npm run typecheck
```

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit command workflow**

```bash
jj describe -m "feat(pi): apply skill toggles and reload"
jj new
```

### Task 7: Register the Command and Integrate Startup Overrides

**Files:**

- Modify: `pi/extensions/pi-skill-visibility/index.ts`
- Modify: `pi/extensions/pi-skill-visibility/index.test.ts`
- Modify: `tests/test_install_pi.sh`

**Interfaces:**

- Consumes: registry reader, resolved enforcer result, prompt rewriting, and `runToggleSkillsCommand`.
- Produces: `/toggle-skills` command registration.
- Preserves: `before_agent_start` first-turn enforcement and bounded warnings.

- [ ] **Step 1: Extend the index integration test with command registration and an override registry**

In `index.test.ts`:

1. Make the fake `ExtensionAPI` capture both `pi.on("before_agent_start", ...)` and `pi.registerCommand("toggle-skills", ...)`.
2. Set `PI_CODING_AGENT_DIR` to the temporary directory for the test and restore the original environment value in `finally`.
3. Write this registry before invoking the handler:

```ts
await writeFile(join(dir, "skill-visibility.json"), JSON.stringify({
  version: 1,
  overrides: {
    [debuggingPath]: "manual",
    [wikiPath]: "startup",
  },
}), "utf8");
```

4. Change assertions so the first prompt contains `wiki`, omits `systematic-debugging`, writes `disable-model-invocation: true` to the debugging file, and removes the field from the wiki file.
5. Assert the registered command name is `toggle-skills` and its description mentions Startup/Manual visibility.

- [ ] **Step 2: Run the index test and verify it fails**

Run:

```bash
node --test index.test.ts
```

Expected: FAIL because `index.ts` neither reads the registry nor registers the command.

- [ ] **Step 3: Integrate registry-backed lifecycle enforcement**

Update `index.ts` so the extension registers the command and the lifecycle reads the registry once per runtime:

```ts
import {
  formatSkillsForPrompt,
  type ExtensionAPI,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import { readVisibilityRegistry, visibilityRegistryPath } from "./registry.ts";
import { rewriteSkillPrompt } from "./prompt.ts";
import { runToggleSkillsCommand } from "./toggle-command.ts";

export default function skillVisibilityExtension(pi: ExtensionAPI): void {
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
    enforcement ??= loadAndEnforce(skills);
    const result = await enforcement;
    const modesByPath = new Map(result.resolved.map((item) => [item.skill.filePath, item.mode]));
    const rewritten = rewriteSkillPrompt(
      event.systemPrompt,
      skills,
      modesByPath,
      formatSkillsForPrompt,
      !event.systemPromptOptions.selectedTools || event.systemPromptOptions.selectedTools.includes("read"),
    );

    if (!warned && (result.errors.length > 0 || rewritten.error)) {
      warned = true;
      const details = result.errors.slice(0, 3).map((error) => `${error.name} (${error.path}): ${error.message}`);
      if (result.errors.length > 3) details.push(`… ${result.errors.length - 3} more`);
      if (rewritten.error) details.push(rewritten.error);
      ctx.ui.notify(
        `Skill visibility policy had ${result.errors.length + (rewritten.error ? 1 : 0)} error(s):\n${details.join("\n")}`,
        "warning",
      );
    }
    return { systemPrompt: rewritten.systemPrompt };
  });
}

async function loadAndEnforce(skills: Skill[]): Promise<EnforcementResult> {
  try {
    const registry = await readVisibilityRegistry(visibilityRegistryPath());
    return enforceSkillVisibility(skills, registry.overrides);
  } catch (error) {
    const fallback = await enforceSkillVisibility(skills, {});
    fallback.errors.unshift({
      name: "override registry",
      path: visibilityRegistryPath(),
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
```

The fallback enforces checked-in defaults but never rewrites the malformed registry.

- [ ] **Step 4: Add installer preservation coverage**

Before the first `install-pi` call in `tests/test_install_pi.sh`, seed:

```bash
cat >"$pi_dir/skill-visibility.json" <<'EOF'
{
  "version": 1,
  "overrides": {
    "/skills/wiki/SKILL.md": "startup"
  }
}
EOF
cp "$pi_dir/skill-visibility.json" "$temp_dir/skill-visibility.expected.json"
```

After the second idempotence call, add:

```bash
cmp "$temp_dir/skill-visibility.expected.json" "$pi_dir/skill-visibility.json"
```

This is a preservation test; `install-pi` should need no implementation change.

- [ ] **Step 5: Run integration and installer tests**

Run:

```bash
cd pi/extensions/pi-skill-visibility
node --test index.test.ts
cd ../../..
bash tests/test_install_pi.sh
```

Expected: index integration passes and installer preservation exits 0.

- [ ] **Step 6: Run the complete extension suite and typecheck**

Run:

```bash
cd pi/extensions/pi-skill-visibility
npm test
npm run typecheck
```

Expected: every extension test passes and TypeScript exits 0.

- [ ] **Step 7: Run every installer test**

Run:

```bash
cd ../../..
for test in tests/test_install*.sh; do bash "$test"; done
```

Expected: all 6 installer scripts exit 0.

- [ ] **Step 8: Run Pi Lens diagnostics**

Run Pi Lens on:

```text
pi/extensions/pi-skill-visibility/
install-pi
tests/test_install_pi.sh
```

Expected: no blocking errors or warnings caused by this change.

- [ ] **Step 9: Commit lifecycle and installer integration**

```bash
jj describe -m "feat(pi): register skill toggle popup"
jj new
```

### Task 8: Verify Runtime Behavior Against Pi

**Files:**

- No source changes expected.

**Interfaces:**

- Verifies the real Pi `Skill[]`, command registration, prompt formatting, reload lifecycle, and registry persistence.

- [ ] **Step 1: Create a disposable Pi profile with deliberately wrong fixture visibility**

Run:

```bash
temp_profile="$(mktemp -d)"
mkdir -p \
  "$temp_profile/skills/systematic-debugging" \
  "$temp_profile/skills/wiki" \
  "$temp_profile/extensions"
ln -s \
  "$PWD/pi/extensions/pi-skill-visibility" \
  "$temp_profile/extensions/pi-skill-visibility"
cat >"$temp_profile/skills/systematic-debugging/SKILL.md" <<'EOF'
---
name: systematic-debugging
description: Startup default fixture.
---

# Systematic Debugging Fixture
EOF
cat >"$temp_profile/skills/wiki/SKILL.md" <<'EOF'
---
name: wiki
description: Manual default fixture.
disable-model-invocation: true
---

# Wiki Fixture
EOF
cat >"$temp_profile/skill-visibility.json" <<EOF
{
  "version": 1,
  "overrides": {
    "$temp_profile/skills/systematic-debugging/SKILL.md": "manual",
    "$temp_profile/skills/wiki/SKILL.md": "startup"
  }
}
EOF
```

Expected: both fixture skills and the version-1 exact-path registry exist.

- [ ] **Step 2: Create a canonical-loader and package-update simulation script**

Run:

```bash
cat >"$temp_profile/check.mjs" <<'EOF'
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const piIndex = pathToFileURL(join(dirname(process.env.PI_ENTRY), "index.js")).href;
const { loadSkills, formatSkillsForPrompt } = await import(piIndex);
const { enforceSkillVisibility } = await import(
  pathToFileURL(join(process.env.EXTENSION_ROOT, "enforcer.ts")).href
);
const { readVisibilityRegistry } = await import(
  pathToFileURL(join(process.env.EXTENSION_ROOT, "registry.ts")).href
);
const { rewriteSkillPrompt } = await import(
  pathToFileURL(join(process.env.EXTENSION_ROOT, "prompt.ts")).href
);

const load = () => loadSkills({
  cwd: process.env.TEMP_PROFILE,
  agentDir: process.env.TEMP_PROFILE,
  skillPaths: [],
  includeDefaults: true,
}).skills;

const registryPath = join(process.env.TEMP_PROFILE, "skill-visibility.json");
const registry = await readVisibilityRegistry(registryPath);
const before = load();
assert.deepEqual(before.map((skill) => skill.name).sort(), ["systematic-debugging", "wiki"]);

const originalPrompt = `Header${formatSkillsForPrompt(before)}\nCurrent working directory: ${process.env.TEMP_PROFILE}`;
const first = await enforceSkillVisibility(before, registry.overrides);
const firstModes = new Map(first.resolved.map((item) => [item.skill.filePath, item.mode]));
const rewritten = rewriteSkillPrompt(originalPrompt, before, firstModes, formatSkillsForPrompt);
assert.doesNotMatch(rewritten.systemPrompt, /<name>systematic-debugging<\/name>/);
assert.match(rewritten.systemPrompt, /<name>wiki<\/name>/);

let after = load();
assert.equal(after.find((skill) => skill.name === "systematic-debugging")?.disableModelInvocation, true);
assert.equal(after.find((skill) => skill.name === "wiki")?.disableModelInvocation, false);

const wikiPath = join(process.env.TEMP_PROFILE, "skills/wiki/SKILL.md");
const wiki = await readFile(wikiPath, "utf8");
await writeFile(
  wikiPath,
  wiki.replace("description: Manual default fixture.\n", "description: Manual default fixture.\ndisable-model-invocation: true\n"),
  "utf8",
);
assert.equal(load().find((skill) => skill.name === "wiki")?.disableModelInvocation, true);

await enforceSkillVisibility(load(), registry.overrides);
after = load();
assert.equal(after.find((skill) => skill.name === "wiki")?.disableModelInvocation, false);
console.log("skill visibility registry integration passed");
EOF
```

Expected: `$temp_profile/check.mjs` contains exact assertions for first-turn rewriting and update restoration.

- [ ] **Step 3: Run the integration script twice to verify behavior and idempotence**

Run:

```bash
PI_ENTRY="$(realpath "$(command -v pi)")" \
EXTENSION_ROOT="$PWD/pi/extensions/pi-skill-visibility" \
TEMP_PROFILE="$temp_profile" \
node --experimental-strip-types "$temp_profile/check.mjs"
before_hashes="$(shasum "$temp_profile/skills/systematic-debugging/SKILL.md" "$temp_profile/skills/wiki/SKILL.md")"
PI_ENTRY="$(realpath "$(command -v pi)")" \
EXTENSION_ROOT="$PWD/pi/extensions/pi-skill-visibility" \
TEMP_PROFILE="$temp_profile" \
node --experimental-strip-types "$temp_profile/check.mjs"
after_hashes="$(shasum "$temp_profile/skills/systematic-debugging/SKILL.md" "$temp_profile/skills/wiki/SKILL.md")"
[[ "$before_hashes" == "$after_hashes" ]]
```

Expected: `skill visibility registry integration passed` prints twice and the hash comparison exits 0.

- [ ] **Step 4: Verify the popup manually**

Remove the scripted registry, start interactive Pi with the disposable profile, and open the popup:

```bash
rm "$temp_profile/skill-visibility.json"
PI_CODING_AGENT_DIR="$temp_profile" pi
```

Then run:

```text
/toggle-skills
```

Verify:

- compact list, source labels, counts, and status labels render;
- `j/k` and `n/e` move identically;
- `gg/G` jump to bounds;
- `/` enters Search mode and `e` types the letter `e` there;
- Space marks one row changed;
- `q` cancels without a registry;
- `s` saves, creates the registry, shows one result, and reloads;
- reopening the popup shows the saved effective mode.

- [ ] **Step 5: Remove the disposable profile**

Run:

```bash
rm -rf "$temp_profile"
```

Expected: the disposable profile is removed.

- [ ] **Step 6: Re-run final automated verification**

Run:

```bash
cd pi/extensions/pi-skill-visibility
npm test
npm run typecheck
cd ../../..
for test in tests/test_install*.sh; do bash "$test"; done
jj status
```

Expected: all extension and installer tests pass. The working copy contains only the intended implementation files, with no temporary profile or generated UI state.

- [ ] **Step 7: Record verification evidence in the final handoff**

Report:

- extension test count and zero failures;
- successful TypeScript typecheck;
- 6 installer scripts passing;
- successful canonical-loader and package-update simulation;
- manual popup key checks;
- any residual read-only projection limitations.
