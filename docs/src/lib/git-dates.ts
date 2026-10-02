/**
 * Git dates
 *
 * Each page's last-updated date: the newest commit touching any of its source
 * files. A date is never guessed. In a shallow clone every file would look as
 * old as the newest commit, so there are no dates at all; an untracked file,
 * a path with no commits, or no git gives no date either.
 */
import { execFileSync } from "node:child_process";

/** Runs git with the given arguments and returns its standard output; throws when git fails or is missing. */
export type GitRunner = (args: string[]) => string;

const runGit: GitRunner = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true });

/**
 * The date lookups over one git runner, with their answers cached for the
 * rest of the build.
 *
 * @param run - Runs git; tests pass a stub.
 */
export function createGitDates(run: GitRunner = runGit) {
  let shallow: boolean | undefined;
  const dates = new Map<string, string | null>();

  /** True when the checkout is shallow (`git rev-parse --is-shallow-repository`), or when git cannot tell. */
  function isShallowRepo(): boolean {
    if (shallow === undefined) {
      try {
        shallow = run(["rev-parse", "--is-shallow-repository"]).trim() !== "false";
      } catch {
        shallow = true;
      }
    }
    return shallow;
  }

  /**
   * The ISO 8601 date of the newest commit touching any of the paths.
   *
   * @param paths - Paths from the repository root (`docs/src/content/docs/en/theming.mdx`, `src/data-table/`).
   * @returns The committer date, or null when the clone is shallow, the paths have no commits, or git is missing.
   */
  function lastModified(paths: string[]): string | null {
    if (paths.length === 0) return null;
    const key = [...paths].sort().join("\n");
    const known = dates.get(key);
    if (known !== undefined) return known;
    let date: string | null = null;
    if (!isShallowRepo()) {
      try {
        // `:(top,literal)` reads each path from the repository root, whatever the working directory, and takes `[...lang]` literally.
        date = run(["log", "-1", "--format=%cI", "--", ...paths.map((path) => `:(top,literal)${path}`)]).trim() || null;
      } catch {
        date = null;
      }
    }
    dates.set(key, date);
    return date;
  }

  return { isShallowRepo, lastModified };
}

const shared = createGitDates();

/** Whether this checkout is shallow. See {@link createGitDates}. */
export const isShallowRepo = shared.isShallowRepo;

/** The newest commit date of the paths, cached per build. See {@link createGitDates}. */
export const lastModified = shared.lastModified;
