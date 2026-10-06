import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Folders an installed or built app leaves behind. They hold no docs content,
 * and a workspace link inside `node_modules` leads back to the repository, so
 * a walk that enters one never ends.
 */
export const APP_FOLDERS: readonly string[] = ["node_modules", ".next", "dist"];

/** Every file under a folder, recursively, without entering folders named in `skip`. */
export function filesUnder(dir: string, skip: readonly string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return skip.includes(entry.name) ? [] : filesUnder(path, skip);
    return entry.isFile() ? [path] : [];
  });
}
