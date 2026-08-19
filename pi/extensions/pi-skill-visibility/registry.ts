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
