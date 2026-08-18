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
    .filter(
      (entry): entry is { index: number; match: RegExpMatchArray } => entry.match !== null,
    );

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
