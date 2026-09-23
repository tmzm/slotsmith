import type { Rejection, RejectionReason } from "./types";

/**
 * Format bytes
 *
 * A short, human size: `900 B`, `512 KB`, `25 MB`.
 *
 * @param bytes - The size to format.
 * @returns The size with a unit.
 *
 * @example
 * ```ts
 * formatBytes(26214400); // "25 MB"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/**
 * Is accepted
 *
 * Whether a file matches an `accept` list, the same way the native input does:
 * `.ext`, `mime/type` or `mime/*`. The browser only filters the file dialog, so
 * dropped files have to be checked here too.
 *
 * @param file - The file to test; only `name` and `type` are read.
 * @param accept - A comma-separated list, or an array of the same tokens.
 * @returns Whether the file is allowed.
 *
 * @example
 * ```ts
 * isAccepted(png, "image/*,.pdf"); // true
 * ```
 */
export function isAccepted(file: Pick<File, "name" | "type">, accept?: string | string[]): boolean {
  if (!accept) return true;
  const tokens = (Array.isArray(accept) ? accept : accept.split(","))
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token === "*" || token === "*/*") return true;
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/**
 * Is image
 *
 * Whether an item can be shown as a picture.
 *
 * @param type - The MIME type.
 * @returns Whether it starts with `image/`.
 */
export const isImage = (type: string | undefined) => !!type && type.startsWith("image/");

/**
 * Validation labels
 *
 * The wording used when a file is turned away. Every message is a function, so
 * translations can reorder the sentence.
 */
export interface ValidationLabels {
  wrongType: (name: string) => string;
  tooLarge: (name: string, max: string) => string;
  tooSmall: (name: string, min: string) => string;
  tooMany: (max: number) => string;
}

/**
 * Default validation labels
 *
 * English wording for the four ways a file can be refused.
 */
export const defaultValidationLabels: ValidationLabels = {
  wrongType: (name) => `${name} is not an allowed file type`,
  tooLarge: (name, max) => `${name} is too large (max ${max})`,
  tooSmall: (name, min) => `${name} is too small (min ${min})`,
  tooMany: (max) => `Only ${max} ${max === 1 ? "file" : "files"} allowed`,
};

/**
 * Constraints
 *
 * The rules a picked file has to satisfy.
 */
export interface Constraints {
  accept?: string | string[];
  maxSize?: number;
  minSize?: number;
  /** How many items the list may hold in total. */
  maxFiles?: number;
  /** Your own rule. Return a message to refuse the file, or nothing to allow it. */
  validate?: (file: File) => string | null | undefined;
}

/**
 * Screen files
 *
 * Applies the constraints to a batch of picked files, keeping the order and
 * stopping at `maxFiles` — so dropping twenty files into a three-slot uploader
 * accepts three and explains the rest.
 *
 * @param files - The picked or dropped files.
 * @param constraints - See {@link Constraints}.
 * @param taken - How many slots the list already uses.
 * @param labels - Wording for the refusals.
 * @returns The accepted files and a rejection per refused file.
 *
 * @example
 * ```ts
 * const { accepted, rejected } = screenFiles(dropped, { maxFiles: 3 }, items.length);
 * ```
 */
export function screenFiles(
  files: File[],
  constraints: Constraints = {},
  taken = 0,
  labels: ValidationLabels = defaultValidationLabels,
): { accepted: File[]; rejected: Rejection[] } {
  const { accept, maxSize, minSize, maxFiles, validate } = constraints;
  const accepted: File[] = [];
  const rejected: Rejection[] = [];

  const refuse = (file: File, reason: RejectionReason, message: string) =>
    rejected.push({ file, reason, message });

  for (const file of files) {
    if (maxFiles !== undefined && taken + accepted.length >= maxFiles) {
      refuse(file, "count", labels.tooMany(maxFiles));
      continue;
    }
    if (!isAccepted(file, accept)) {
      refuse(file, "type", labels.wrongType(file.name));
      continue;
    }
    if (maxSize !== undefined && file.size > maxSize) {
      refuse(file, "size-max", labels.tooLarge(file.name, formatBytes(maxSize)));
      continue;
    }
    if (minSize !== undefined && file.size < minSize) {
      refuse(file, "size-min", labels.tooSmall(file.name, formatBytes(minSize)));
      continue;
    }
    const custom = validate?.(file);
    if (custom) {
      refuse(file, "custom", custom);
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
