# Pi Skill Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep 29 workflow and domain skills visible to the agent while making every other loaded Pi skill available only through `/skill:<name>`.

**Architecture:** A global Pi extension uses `before_agent_start`, the first supported hook that sees Pi's canonical loaded `Skill[]`, to enforce `disable-model-invocation` in each source file before the model request. It rewrites only Pi's exact generated skills block for the current turn, using Pi's exported `formatSkillsForPrompt`, so the first turn already follows policy while the persisted frontmatter controls later startups. The dotagent installer symlinks the versioned extension into every configured Pi profile.

**Tech Stack:** TypeScript with Node.js 26 built-in type stripping and test runner, Pi extension API 0.84+, Node `fs/promises`, Bash installer tests, Jujutsu.

## Global Constraints

- Preserve `/skill:<name>` commands for every manual-only skill.
- Use `disable-model-invocation: true` for manual-only skills and remove the field for agent-visible skills.
- Preserve skill bodies, unrelated frontmatter, and LF/CRLF line endings.
- Reject duplicate visibility keys and malformed frontmatter without blocking other skills.
- Deduplicate skill files by canonical path and write changes atomically.
- Emit at most one concise warning summary per extension runtime.
- Do not start watchers, timers, subprocesses, synthetic user messages, extra model turns, or reload loops.
- Do not replace an unrelated existing extension installation path.
- Treat Pi's canonical `BuildSystemPromptOptions.skills` list as discovery truth; do not rescan package directories independently.
- Keep all work in `/Users/aktersnurra/projects/dotagent.workspaces/pi-skill-visibility`; do not modify the default workspace containing the user's concurrent update.

---

## File Map

- `pi/extensions/pi-skill-visibility/policy.ts` — committed agent-visible allowlist and visibility decision.
- `pi/extensions/pi-skill-visibility/frontmatter.ts` — minimal frontmatter patching and atomic writes.
- `pi/extensions/pi-skill-visibility/enforcer.ts` — canonical-path deduplication, per-skill enforcement, and error aggregation.
- `pi/extensions/pi-skill-visibility/prompt.ts` — current-turn replacement of Pi's exact generated skills block.
- `pi/extensions/pi-skill-visibility/index.ts` — thin Pi lifecycle adapter and one-time warning behavior.
- `pi/extensions/pi-skill-visibility/policy.test.ts` — allowlist contract tests.
- `pi/extensions/pi-skill-visibility/frontmatter.test.ts` — byte-preservation and malformed-input tests.
- `pi/extensions/pi-skill-visibility/enforcer.test.ts` — deduplication and failure-isolation tests.
- `pi/extensions/pi-skill-visibility/prompt.test.ts` — first-turn filtering and insertion tests.
- `install-pi` — safe, idempotent global extension symlink installation.
- `tests/test_install_pi.sh` — installer success, idempotence, and collision coverage.

### Task 1: Encode the Agent-Visible Policy

**Files:**

- Create: `pi/extensions/pi-skill-visibility/policy.ts`
- Create: `pi/extensions/pi-skill-visibility/policy.test.ts`

**Interfaces:**

- Produces: `AGENT_VISIBLE_SKILL_NAMES: ReadonlySet<string>`
- Produces: `desiredDisableModelInvocation(name: string): boolean`

- [ ] **Step 1: Write the failing policy tests**

Create `pi/extensions/pi-skill-visibility/policy.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_VISIBLE_SKILL_NAMES,
  desiredDisableModelInvocation,
} from "./policy.ts";

const expectedAgentVisible = [
  "ask-user",
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

test("agent-visible allowlist matches the approved policy", () => {
  assert.deepEqual([...AGENT_VISIBLE_SKILL_NAMES].sort(), [...expectedAgentVisible].sort());
  assert.equal(AGENT_VISIBLE_SKILL_NAMES.size, 29);
});

test("allowlisted skills stay model-invocable", () => {
  assert.equal(desiredDisableModelInvocation("systematic-debugging"), false);
  assert.equal(desiredDisableModelInvocation("elixir"), false);
});

test("all other skills become manual-only", () => {
  assert.equal(desiredDisableModelInvocation("ctx-purge"), true);
  assert.equal(desiredDisableModelInvocation("wiki"), true);
  assert.equal(desiredDisableModelInvocation("new-package-skill"), true);
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/policy.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./policy.ts`.

- [ ] **Step 3: Implement the policy**

Create `pi/extensions/pi-skill-visibility/policy.ts`:

```ts
export const AGENT_VISIBLE_SKILL_NAMES: ReadonlySet<string> = new Set([
  "ask-user",
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
]);

export function desiredDisableModelInvocation(name: string): boolean {
  return !AGENT_VISIBLE_SKILL_NAMES.has(name);
}
```

- [ ] **Step 4: Run the policy tests**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/policy.test.ts
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit the policy**

```bash
jj describe -m "feat(pi): define agent-visible skill policy"
jj new
```

### Task 2: Patch Frontmatter Safely

**Files:**

- Create: `pi/extensions/pi-skill-visibility/frontmatter.ts`
- Create: `pi/extensions/pi-skill-visibility/frontmatter.test.ts`

**Interfaces:**

- Produces: `PatchResult`
- Produces: `patchSkillFrontmatter(raw: string, disabled: boolean): PatchResult`
- Produces: `writeSkillVisibility(filePath: string, disabled: boolean): Promise<WriteResult>`

- [ ] **Step 1: Write failing frontmatter tests**

Create `pi/extensions/pi-skill-visibility/frontmatter.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { patchSkillFrontmatter, writeSkillVisibility } from "./frontmatter.ts";

const body = "\n# Example\n\nKeep this body unchanged.\n";

test("adds manual-only field without changing unrelated bytes", () => {
  const raw = `---\nname: example\ndescription: Example skill.\n---${body}`;
  const result = patchSkillFrontmatter(raw, true);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: `---\nname: example\ndescription: Example skill.\ndisable-model-invocation: true\n---${body}`,
  });
});

test("removes the field for an agent-visible skill", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\ndescription: Example skill.\n---${body}`;
  const result = patchSkillFrontmatter(raw, false);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: `---\nname: example\ndescription: Example skill.\n---${body}`,
  });
});

test("preserves CRLF and an inline comment while changing false to true", () => {
  const raw = "---\r\nname: example\r\ndisable-model-invocation: false # policy\r\n---\r\nBody\r\n";
  const result = patchSkillFrontmatter(raw, true);
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    content: "---\r\nname: example\r\ndisable-model-invocation: true # policy\r\n---\r\nBody\r\n",
  });
});

test("is idempotent when visibility already matches", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: true,
    changed: false,
    content: raw,
  });
});

test("rejects duplicate visibility keys", () => {
  const raw = `---\nname: example\ndisable-model-invocation: true\ndisable-model-invocation: false\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: false,
    message: "duplicate disable-model-invocation fields",
  });
});

test("rejects a non-boolean visibility value", () => {
  const raw = `---\nname: example\ndisable-model-invocation: sometimes\n---${body}`;
  assert.deepEqual(patchSkillFrontmatter(raw, true), {
    ok: false,
    message: "disable-model-invocation must be true or false",
  });
});

test("rejects missing closing frontmatter", () => {
  assert.deepEqual(patchSkillFrontmatter("---\nname: example\n", true), {
    ok: false,
    message: "missing closing frontmatter delimiter",
  });
});

test("atomic writer skips unchanged files and persists changed files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-skill-visibility-"));
  const file = join(dir, "SKILL.md");
  const raw = `---\nname: example\ndescription: Example.\n---${body}`;
  try {
    await writeFile(file, raw, "utf8");
    const first = await writeSkillVisibility(file, true);
    assert.deepEqual(first, { changed: true });
    const afterFirst = await readFile(file, "utf8");
    assert.match(afterFirst, /disable-model-invocation: true/);
    const second = await writeSkillVisibility(file, true);
    assert.deepEqual(second, { changed: false });
    assert.equal(await readFile(file, "utf8"), afterFirst);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/frontmatter.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./frontmatter.ts`.

- [ ] **Step 3: Implement minimal patching and atomic writes**

Create `pi/extensions/pi-skill-visibility/frontmatter.ts`:

```ts
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const visibilityKey = /^([ \t]*)disable-model-invocation([ \t]*):([ \t]*)([^#\r\n]*?)([ \t]*)(#.*)?$/;

export type PatchResult =
  | { ok: true; changed: boolean; content: string }
  | { ok: false; message: string };

export interface WriteResult {
  changed: boolean;
}

export function patchSkillFrontmatter(raw: string, disabled: boolean): PatchResult {
  const opening = raw.match(/^---[ \t]*(\r?\n)/);
  if (!opening) return { ok: false, message: "missing opening frontmatter delimiter" };

  const lineEnding = opening[1];
  const closingMarker = `${lineEnding}---`;
  const closingIndex = raw.indexOf(closingMarker, opening[0].length);
  if (closingIndex < 0) return { ok: false, message: "missing closing frontmatter delimiter" };

  const frontmatter = raw.slice(opening[0].length, closingIndex);
  const lines = frontmatter.length === 0 ? [] : frontmatter.split(lineEnding);
  const matches = lines
    .map((line, index) => ({ index, match: line.match(visibilityKey) }))
    .filter((entry) => entry.match !== null);

  if (matches.length > 1) {
    return { ok: false, message: "duplicate disable-model-invocation fields" };
  }

  const current = matches.length === 1 ? matches[0].match[4].trim() : undefined;
  if (current !== undefined && current !== "true" && current !== "false") {
    return { ok: false, message: "disable-model-invocation must be true or false" };
  }

  if (!disabled) {
    if (matches.length === 0) return { ok: true, changed: false, content: raw };
    lines.splice(matches[0].index, 1);
  } else if (matches.length === 0) {
    lines.push("disable-model-invocation: true");
  } else {
    const { index, match } = matches[0];
    if (current === "true") return { ok: true, changed: false, content: raw };
    lines[index] = `${match[1]}disable-model-invocation${match[2]}:${match[3]}true${match[5]}${match[6] ?? ""}`;
  }

  const updatedFrontmatter = lines.join(lineEnding);
  const content = `${raw.slice(0, opening[0].length)}${updatedFrontmatter}${raw.slice(closingIndex)}`;
  return { ok: true, changed: content !== raw, content };
}

export async function writeSkillVisibility(filePath: string, disabled: boolean): Promise<WriteResult> {
  const raw = await readFile(filePath, "utf8");
  const patch = patchSkillFrontmatter(raw, disabled);
  if (!patch.ok) throw new Error(patch.message);
  if (!patch.changed) return { changed: false };

  const fileStat = await stat(filePath);
  const tempPath = join(dirname(filePath), `.${basename(filePath)}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, patch.content, { encoding: "utf8", mode: fileStat.mode });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
  return { changed: true };
}
```

- [ ] **Step 4: Run the frontmatter tests**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/frontmatter.test.ts
```

Expected: 8 tests pass, 0 fail.

- [ ] **Step 5: Commit frontmatter enforcement**

```bash
jj describe -m "feat(pi): patch skill visibility frontmatter safely"
jj new
```

### Task 3: Enforce Loaded Skills and Rewrite the First-Turn Prompt

**Files:**

- Create: `pi/extensions/pi-skill-visibility/enforcer.ts`
- Create: `pi/extensions/pi-skill-visibility/enforcer.test.ts`
- Create: `pi/extensions/pi-skill-visibility/prompt.ts`
- Create: `pi/extensions/pi-skill-visibility/prompt.test.ts`
- Create: `pi/extensions/pi-skill-visibility/index.ts`

**Interfaces:**

- Consumes: `desiredDisableModelInvocation(name)` and `writeSkillVisibility(path, disabled)`
- Produces: `SkillIdentity`, `EnforcementResult`, and `enforceSkillVisibility(skills, dependencies?)`
- Produces: `rewriteSkillPrompt(systemPrompt, skills, visibleNames, formatter)`
- Produces: default Pi extension factory in `index.ts`

- [ ] **Step 1: Write failing enforcer tests**

Create `pi/extensions/pi-skill-visibility/enforcer.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { enforceSkillVisibility, type SkillIdentity } from "./enforcer.ts";

const skills: SkillIdentity[] = [
  { name: "systematic-debugging", filePath: "/skills/debug/SKILL.md" },
  { name: "ctx-purge", filePath: "/skills/purge/SKILL.md" },
  { name: "ctx-purge-copy", filePath: "/skills/purge-link/SKILL.md" },
];

test("deduplicates canonical paths and applies approved visibility", async () => {
  const writes: Array<[string, boolean]> = [];
  const result = await enforceSkillVisibility(skills, {
    realpath: async (path) => path.includes("purge") ? "/real/purge/SKILL.md" : path,
    writeVisibility: async (path, disabled) => {
      writes.push([path, disabled]);
      return { changed: true };
    },
  });
  assert.deepEqual(writes, [
    ["/skills/debug/SKILL.md", false],
    ["/real/purge/SKILL.md", true],
  ]);
  assert.equal(result.changed.length, 2);
  assert.deepEqual(result.errors, []);
});

test("continues after a per-skill failure", async () => {
  const attempted: string[] = [];
  const result = await enforceSkillVisibility(skills.slice(0, 2), {
    realpath: async (path) => path,
    writeVisibility: async (path) => {
      attempted.push(path);
      if (path.includes("debug")) throw new Error("read-only file system");
      return { changed: true };
    },
  });
  assert.deepEqual(attempted, ["/skills/debug/SKILL.md", "/skills/purge/SKILL.md"]);
  assert.equal(result.changed.length, 1);
  assert.deepEqual(result.errors, [{
    name: "systematic-debugging",
    path: "/skills/debug/SKILL.md",
    message: "read-only file system",
  }]);
});
```

- [ ] **Step 2: Write failing prompt tests**

Create `pi/extensions/pi-skill-visibility/prompt.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { rewriteSkillPrompt, type PromptSkill } from "./prompt.ts";

const skills: PromptSkill[] = [
  { name: "systematic-debugging", disableModelInvocation: false },
  { name: "ctx-purge", disableModelInvocation: false },
];
const visible = new Set(["systematic-debugging"]);
const format = (items: PromptSkill[]) => {
  const names = items.filter((item) => !item.disableModelInvocation).map((item) => item.name);
  return names.length === 0 ? "" : `\n<available_skills>${names.join(",")}</available_skills>\n`;
};

test("replaces Pi's exact current skills block", () => {
  const original = `Header${format(skills)}\nCurrent working directory: /repo`;
  assert.deepEqual(rewriteSkillPrompt(original, skills, visible, format), {
    systemPrompt: `Header${format([{ name: "systematic-debugging", disableModelInvocation: false }])}\nCurrent working directory: /repo`,
  });
});

test("inserts allowlisted skills when all source files were manual-only", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  const original = "Header\nCurrent working directory: /repo";
  const result = rewriteSkillPrompt(original, manualSkills, visible, format);
  assert.equal(result.systemPrompt, `Header${format([{ name: "systematic-debugging", disableModelInvocation: false }])}\nCurrent working directory: /repo`);
});

test("does not insert skills when the read tool is disabled", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt(
    "Header\nCurrent working directory: /repo",
    manualSkills,
    visible,
    format,
    false,
  ), { systemPrompt: "Header\nCurrent working directory: /repo" });
});

test("returns a diagnostic instead of guessing when the prompt shape is unknown", () => {
  const manualSkills = skills.map((skill) => ({ ...skill, disableModelInvocation: true }));
  assert.deepEqual(rewriteSkillPrompt("Custom prompt", manualSkills, visible, format), {
    systemPrompt: "Custom prompt",
    error: "could not locate Pi's working-directory marker",
  });
});
```

- [ ] **Step 3: Run both test files and verify missing module failures**

Run:

```bash
node --test \
  pi/extensions/pi-skill-visibility/enforcer.test.ts \
  pi/extensions/pi-skill-visibility/prompt.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./enforcer.ts` and `./prompt.ts`.

- [ ] **Step 4: Implement canonical-path enforcement**

Create `pi/extensions/pi-skill-visibility/enforcer.ts`:

```ts
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
```

- [ ] **Step 5: Implement exact prompt-block replacement**

Create `pi/extensions/pi-skill-visibility/prompt.ts`:

```ts
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
```

- [ ] **Step 6: Run the enforcer and prompt tests**

Run:

```bash
node --test \
  pi/extensions/pi-skill-visibility/enforcer.test.ts \
  pi/extensions/pi-skill-visibility/prompt.test.ts
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 7: Add the Pi lifecycle adapter**

Create `pi/extensions/pi-skill-visibility/index.ts`:

```ts
import {
  formatSkillsForPrompt,
  type ExtensionAPI,
  type Skill,
} from "@earendil-works/pi-coding-agent";
import { enforceSkillVisibility, type EnforcementResult } from "./enforcer.ts";
import { AGENT_VISIBLE_SKILL_NAMES } from "./policy.ts";
import { rewriteSkillPrompt } from "./prompt.ts";

export default function skillVisibilityExtension(pi: ExtensionAPI): void {
  let enforcement: Promise<EnforcementResult> | undefined;
  let warned = false;

  pi.on("before_agent_start", async (event, ctx) => {
    const skills = (event.systemPromptOptions.skills ?? []) as Skill[];
    enforcement ??= enforceSkillVisibility(skills);
    const result = await enforcement;

    const rewritten = rewriteSkillPrompt(
      event.systemPrompt,
      skills,
      AGENT_VISIBLE_SKILL_NAMES,
      formatSkillsForPrompt,
      !event.systemPromptOptions.selectedTools || event.systemPromptOptions.selectedTools.includes("read"),
    );

    if (!warned && (result.errors.length > 0 || rewritten.error)) {
      warned = true;
      const details = result.errors
        .slice(0, 3)
        .map((error) => `${error.name} (${error.path}): ${error.message}`);
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
```

- [ ] **Step 8: Run every extension unit test together**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/*.test.ts
```

Expected: 17 tests pass, 0 fail.

- [ ] **Step 9: Run LSP diagnostics on the extension**

Run through Pi's diagnostics tool:

```text
lsp_diagnostics(path="pi/extensions/pi-skill-visibility", serverScope="primary")
```

Expected: no TypeScript errors.

- [ ] **Step 10: Commit runtime enforcement**

```bash
jj describe -m "feat(pi): enforce skill visibility before model requests"
jj new
```

### Task 4: Install the Extension Safely

**Files:**

- Modify: `install-pi`
- Modify: `tests/test_install_pi.sh`

**Interfaces:**

- Consumes: versioned directory `pi/extensions/pi-skill-visibility`
- Produces: symlink `<pi-dir>/extensions/pi-skill-visibility`

- [ ] **Step 1: Extend the installer test with failing assertions**

In `tests/test_install_pi.sh`, add `collision_pi_dir` beside the existing paths:

```bash
collision_pi_dir="$temp_dir/pi-collision"
```

After the current `AGENTS.md` and skill-link assertions, add:

```bash
[[ -L "$pi_dir/extensions/pi-skill-visibility" ]]
actual_extension_link="$(readlink "$pi_dir/extensions/pi-skill-visibility")"
expected_extension_link="$repo_dir/pi/extensions/pi-skill-visibility"
if [[ "$actual_extension_link" != "$expected_extension_link" ]]; then
  printf 'extension link mismatch: got %s, expected %s\n' \
    "$actual_extension_link" "$expected_extension_link" >&2
  exit 1
fi

HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
  "$repo_dir/install-pi" --dir "$pi_dir" --provider github-copilot
[[ "$(readlink "$pi_dir/extensions/pi-skill-visibility")" == "$expected_extension_link" ]]

mkdir -p "$collision_pi_dir/extensions/pi-skill-visibility"
if HOME="$temp_dir/home" PATH="$bin_dir:$PATH" PI_LOG="$pi_log" \
  "$repo_dir/install-pi" --dir "$collision_pi_dir" >/dev/null 2>&1; then
  echo "install-pi replaced an unrelated extension directory" >&2
  exit 1
fi
```

- [ ] **Step 2: Run the installer test and verify it fails**

Run:

```bash
bash tests/test_install_pi.sh
```

Expected: FAIL at `[[ -L "$pi_dir/extensions/pi-skill-visibility" ]]`.

- [ ] **Step 3: Add safe extension linking to `install-pi`**

After argument parsing and before the existing `mkdir -p`, add:

```bash
link_directory() {
  local source="$1"
  local target="$2"

  if [[ -L "$target" ]]; then
    local current
    current="$(readlink "$target")"
    if [[ "$current" == "$source" ]]; then
      return 0
    fi
    printf 'Refusing to replace symlink: %s -> %s\nExpected: %s\n' \
      "$target" "$current" "$source" >&2
    return 1
  fi

  if [[ -e "$target" ]]; then
    printf 'Refusing to replace existing path: %s\n' "$target" >&2
    return 1
  fi

  ln -s "$source" "$target"
}
```

Replace:

```bash
mkdir -p "$PI/skills" "$PI/prompts"
```

with:

```bash
mkdir -p "$PI/skills" "$PI/prompts" "$PI/extensions"
```

After linking `AGENTS.md`, add:

```bash
link_directory \
  "$DOTFILES/pi/extensions/pi-skill-visibility" \
  "$PI/extensions/pi-skill-visibility"
```

- [ ] **Step 4: Run the installer test**

Run:

```bash
bash tests/test_install_pi.sh
```

Expected: PASS with exit code 0.

- [ ] **Step 5: Run the full installer suite**

Run:

```bash
for test in tests/test_install*.sh; do bash "$test"; done
```

Expected: every installer test exits 0.

- [ ] **Step 6: Run all extension tests again**

Run:

```bash
node --test pi/extensions/pi-skill-visibility/*.test.ts
```

Expected: 17 tests pass, 0 fail.

- [ ] **Step 7: Commit installer integration**

```bash
jj describe -m "feat(pi): install skill visibility extension"
jj new
```

### Task 5: Verify the Policy Against Pi's Canonical Skill Loader

**Files:**

- No source changes expected.

**Interfaces:**

- Verifies persisted frontmatter and prompt visibility with Pi's exported `loadSkills` and `formatSkillsForPrompt` functions.

- [ ] **Step 1: Create a disposable profile with two fixture skills**

Run:

```bash
temp_profile="$(mktemp -d)"
mkdir -p "$temp_profile/skills/systematic-debugging" "$temp_profile/skills/wiki"
cat >"$temp_profile/skills/systematic-debugging/SKILL.md" <<'EOF'
---
name: systematic-debugging
description: Allowlisted fixture.
disable-model-invocation: true
---

# Systematic Debugging Fixture
EOF
cat >"$temp_profile/skills/wiki/SKILL.md" <<'EOF'
---
name: wiki
description: Manual fixture.
---

# Wiki Fixture
EOF
```

Expected: both files exist with deliberately incorrect visibility.

- [ ] **Step 2: Create an integration script using the installed Pi entry point**

Run:

```bash
cat >"$temp_profile/check.mjs" <<'EOF'
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const piIndex = pathToFileURL(join(dirname(process.env.PI_ENTRY), "index.js")).href;
const { loadSkills, formatSkillsForPrompt } = await import(piIndex);
const { enforceSkillVisibility } = await import(
  pathToFileURL(join(process.env.EXTENSION_ROOT, "enforcer.ts")).href
);

const load = () => loadSkills({
  cwd: process.env.TEMP_PROFILE,
  agentDir: process.env.TEMP_PROFILE,
  skillPaths: [],
  includeDefaults: true,
}).skills;

const before = load();
assert.deepEqual(before.map((skill) => skill.name).sort(), ["systematic-debugging", "wiki"]);
await enforceSkillVisibility(before);

const after = load();
assert.deepEqual(after.map((skill) => skill.name).sort(), ["systematic-debugging", "wiki"]);
assert.equal(after.find((skill) => skill.name === "systematic-debugging")?.disableModelInvocation, false);
assert.equal(after.find((skill) => skill.name === "wiki")?.disableModelInvocation, true);

const prompt = formatSkillsForPrompt(after);
assert.match(prompt, /<name>systematic-debugging<\/name>/);
assert.doesNotMatch(prompt, /<name>wiki<\/name>/);
console.log("skill visibility integration passed");
EOF
```

Expected: `$temp_profile/check.mjs` exists. The assertion that both skills remain in `after` verifies that manual-only skills remain loaded for `/skill:<name>` registration.

- [ ] **Step 3: Run the integration check**

Run:

```bash
PI_ENTRY="$(realpath "$(command -v pi)")" \
EXTENSION_ROOT="$PWD/pi/extensions/pi-skill-visibility" \
TEMP_PROFILE="$temp_profile" \
node --experimental-strip-types "$temp_profile/check.mjs"
```

Expected: `skill visibility integration passed`.

- [ ] **Step 4: Verify idempotence**

Run:

```bash
before_hashes="$(shasum "$temp_profile/skills/systematic-debugging/SKILL.md" "$temp_profile/skills/wiki/SKILL.md")"
PI_ENTRY="$(realpath "$(command -v pi)")" \
EXTENSION_ROOT="$PWD/pi/extensions/pi-skill-visibility" \
TEMP_PROFILE="$temp_profile" \
node --experimental-strip-types "$temp_profile/check.mjs"
after_hashes="$(shasum "$temp_profile/skills/systematic-debugging/SKILL.md" "$temp_profile/skills/wiki/SKILL.md")"
[[ "$before_hashes" == "$after_hashes" ]]
```

Expected: integration message prints and the hash comparison exits 0.

- [ ] **Step 5: Remove the disposable profile**

Run:

```bash
rm -rf "$temp_profile"
```

Expected: temporary profile is removed.

- [ ] **Step 6: Run final diagnostics and verification**

Run:

```text
lens_diagnostics(mode="all")
```

Then run:

```bash
node --test pi/extensions/pi-skill-visibility/*.test.ts
for test in tests/test_install*.sh; do bash "$test"; done
jj status
```

Expected:

- no blocking diagnostics;
- 17 extension tests pass;
- every installer test exits 0;
- `jj status` shows only the empty working-copy change created after the final implementation commit.
