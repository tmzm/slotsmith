import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Installed slotsmith version
 *
 * Looks for `node_modules/slotsmith/package.json` in the working directory
 * and each of its parents, the way Node resolves a package, so a workspace
 * whose dependencies are hoisted to its root is found too.
 *
 * @param cwd - Where the agent runs the server, usually the project root.
 * @returns The installed version, or `undefined` when slotsmith is not installed.
 */
export function findInstalledVersion(cwd: string): string | undefined {
  let dir = cwd;
  for (;;) {
    const manifest = join(dir, "node_modules", "slotsmith", "package.json");
    if (existsSync(manifest)) {
      try {
        const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version?: unknown };
        return typeof version === "string" ? version : undefined;
      } catch {
        return undefined;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Major and minor
 *
 * @param version - A semver string.
 * @returns `"1.4"` for `"1.4.2"`.
 */
const majorMinor = (version: string): string => version.split(".").slice(0, 2).join(".");

/**
 * Version warning
 *
 * A one-line notice for when the project's slotsmith and the knowledge the
 * server carries describe different releases. Patch releases never change
 * the API, so only the major and minor are compared.
 *
 * @param installed - The project's slotsmith version, if any.
 * @param described - The version the knowledge was generated from.
 * @returns The warning, or `undefined` when they agree or nothing is installed.
 */
export function versionWarning(installed: string | undefined, described: string): string | undefined {
  if (!installed || majorMinor(installed) === majorMinor(described)) return undefined;
  return `Warning: this project has slotsmith ${installed} installed, but this server describes slotsmith ${described}; props and slots may differ. Check the installed types, or install slotsmith@^${described} to match.`;
}
