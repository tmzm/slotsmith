/**
 * Safe file writing
 *
 * How the CLI puts files into a project it does not own: nothing outside the
 * project, and nothing the user has changed is replaced unless they ask.
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

/**
 * Write result
 *
 * What {@link writeFileSafely} did, or would do on a dry run. `changedLines`
 * is set whenever an existing file differs from the new content: the lines
 * the new content would remove plus the lines it would add.
 */
export type WriteResult = {
  status: "created" | "unchanged" | "overwritten" | "refused" | "would-create" | "would-overwrite";
  path: string;
  changedLines?: number;
};

/**
 * Write options
 */
export interface WriteOptions {
  /** Replace a file whose content differs. */
  force: boolean;
  /** Report what would happen without touching the disk. */
  dryRun: boolean;
}

/**
 * Lines
 *
 * @param text - File content.
 * @returns Its lines, with Windows line endings treated as Unix ones.
 */
const lines = (text: string): string[] => text.replace(/\r\n/g, "\n").split("\n");

/**
 * Changed line count
 *
 * The size of a line diff between two texts: every line not in their longest
 * common subsequence, on either side. An appended line counts as one, an
 * edited line as two (the old one removed, the new one added).
 *
 * @param before - The current content.
 * @param after - The new content.
 * @returns How many lines differ.
 */
export function changedLineCount(before: string, after: string): number {
  const a = lines(before);
  const b = lines(after);
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      current[j] = a[i - 1] === b[j - 1] ? previous[j - 1]! + 1 : Math.max(previous[j]!, current[j - 1]!);
    }
    previous = current;
  }
  const common = previous[b.length]!;
  return a.length - common + (b.length - common);
}

/**
 * Write file safely
 *
 * Writes `content` to `path` unless that would lose the user's work. Content
 * that differs only in line endings counts as the same, so a checkout that
 * converted them is not reported as an edit.
 *
 * @param path - The absolute file path.
 * @param content - What the file should hold.
 * @param options - Whether to overwrite a differing file, and whether to only pretend.
 * @returns What was done.
 */
export function writeFileSafely(path: string, content: string, options: WriteOptions): WriteResult {
  if (!existsSync(path)) {
    if (options.dryRun) return { status: "would-create", path };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { status: "created", path };
  }

  const current = readFileSync(path, "utf8");
  if (current.replace(/\r\n/g, "\n") === content.replace(/\r\n/g, "\n")) return { status: "unchanged", path };

  const changedLines = changedLineCount(current, content);
  if (options.dryRun) return { status: "would-overwrite", path, changedLines };
  if (!options.force) return { status: "refused", path, changedLines };
  writeFileSync(path, content);
  return { status: "overwritten", path, changedLines };
}

/**
 * Resolve inside
 *
 * Resolves a user-given path against a root and checks that it stays within
 * it. Backslashes are read as separators on every platform, so a Windows
 * path such as `..\outside` is caught wherever the CLI runs.
 *
 * @param root - The absolute project folder.
 * @param target - A path relative to it, or absolute.
 * @returns The absolute path, or `undefined` when it lies outside `root`.
 */
export function resolveInside(root: string, target: string): string | undefined {
  const absolute = resolve(root, target.replace(/\\/g, "/"));
  const rel = relative(root, absolute);
  if (rel === "") return absolute;
  if (isAbsolute(rel) || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\")) return undefined;
  return absolute;
}
