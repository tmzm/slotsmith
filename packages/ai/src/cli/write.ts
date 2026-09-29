/**
 * Safe file writing
 *
 * How the CLI puts files into a project it does not own: nothing outside the
 * project, and nothing the user has changed is replaced unless they ask.
 *
 * @packageDocumentation
 */

import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

/**
 * Write result
 *
 * What {@link writeFileSafely} did, or would do on a dry run. `changedLines`
 * is set whenever an existing file differs from the new content: the lines
 * the new content would remove plus the lines it would add. A dry run
 * without `force` reports `would-refuse` where the real run would refuse.
 */
export type WriteResult = {
  status: "created" | "unchanged" | "overwritten" | "refused" | "would-create" | "would-overwrite" | "would-refuse";
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
  /**
   * Maps both the current and the new content to what is compared, e.g. to
   * leave out a generated header line. Defaults to the content itself.
   */
  normalize?: (content: string) => string;
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
 * that differs only in line endings, or only in what `normalize` leaves out,
 * counts as the same; such a file is reported `unchanged` and never
 * rewritten.
 *
 * @param path - The absolute file path.
 * @param content - What the file should hold.
 * @param options - Whether to overwrite a differing file, whether to only pretend, and what to compare.
 * @returns What was done.
 */
export function writeFileSafely(path: string, content: string, options: WriteOptions): WriteResult {
  if (!existsSync(path)) {
    if (options.dryRun) return { status: "would-create", path };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return { status: "created", path };
  }

  const normalize = options.normalize ?? ((text: string) => text);
  const current = normalize(readFileSync(path, "utf8").replace(/\r\n/g, "\n"));
  const next = normalize(content.replace(/\r\n/g, "\n"));
  if (current === next) return { status: "unchanged", path };

  const changedLines = changedLineCount(current, next);
  if (!options.force) return { status: options.dryRun ? "would-refuse" : "refused", path, changedLines };
  if (options.dryRun) return { status: "would-overwrite", path, changedLines };
  writeFileSync(path, content);
  return { status: "overwritten", path, changedLines };
}

/**
 * Is inside
 *
 * @param root - An absolute folder.
 * @param path - An absolute path.
 * @returns Whether `path` is `root` or lies below it.
 */
function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  if (rel === "") return true;
  return !(isAbsolute(rel) || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\"));
}

/**
 * Real path of nearest
 *
 * Follows symbolic links and junctions in the deepest part of a path that
 * exists, and appends the rest, which cannot contain a link yet.
 *
 * @param path - An absolute path, which may not exist.
 * @returns The path as the file system would reach it.
 */
function realPathOfNearest(path: string): string {
  let existing = path;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return path;
    existing = parent;
  }
  return resolve(realpathSync.native(existing), relative(existing, path));
}

/**
 * Resolve inside
 *
 * Resolves a user-given path against a root and checks that it stays within
 * it, both as written and as the file system would follow it: a symbolic
 * link or junction on the way that leads out of the project counts as
 * outside, and so does a target that is itself a symbolic link. Backslashes
 * are read as separators on every platform, so a Windows path such as
 * `..\outside` is caught wherever the CLI runs.
 *
 * @param root - The absolute project folder.
 * @param target - A path relative to it, or absolute.
 * @returns The absolute path, or `undefined` when it lies outside `root`.
 */
export function resolveInside(root: string, target: string): string | undefined {
  const absolute = resolve(root, target.replace(/\\/g, "/"));
  if (!isInside(root, absolute)) return undefined;
  if (lstatSync(absolute, { throwIfNoEntry: false })?.isSymbolicLink()) return undefined;
  if (!isInside(realPathOfNearest(root), realPathOfNearest(absolute))) return undefined;
  return absolute;
}
