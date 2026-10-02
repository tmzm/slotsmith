import { describe, expect, it } from "vitest";
import { createGitDates } from "@/lib/git-dates";

describe("lastModified", () => {
  it("is null in a shallow clone, without asking for a log", () => {
    const calls: string[][] = [];
    const dates = createGitDates((args) => {
      calls.push(args);
      return args[0] === "rev-parse" && args[1] === "--is-shallow-repository" ? "true\n" : "2026-01-01T00:00:00+00:00\n";
    });
    expect(dates.isShallowRepo()).toBe(true);
    expect(dates.lastModified(["README.md"])).toBeNull();
    expect(calls.some((args) => args[0] === "log")).toBe(false);
  });

  it("is null when git is missing or the path has no commits", () => {
    const missing = createGitDates(() => {
      throw new Error("git: not found");
    });
    expect(missing.lastModified(["README.md"])).toBeNull();
    const untracked = createGitDates((args) => (args[0] === "log" ? "" : args[1] === "--is-shallow-repository" ? "false\n" : "/repo\n"));
    expect(untracked.lastModified(["new-file.md"])).toBeNull();
  });

  it("asks once per set of paths within a build", () => {
    let logs = 0;
    const dates = createGitDates((args) => {
      if (args[0] === "log") {
        logs++;
        return "2026-09-30T12:00:00+03:00\n";
      }
      return args[1] === "--is-shallow-repository" ? "false\n" : "/repo\n";
    });
    expect(dates.lastModified(["a.md", "b.md"])).toBe("2026-09-30T12:00:00+03:00");
    expect(dates.lastModified(["a.md", "b.md"])).toBe("2026-09-30T12:00:00+03:00");
    expect(logs).toBe(1);
  });

  it("gives README.md an ISO date in this full clone", async () => {
    const { isShallowRepo, lastModified } = await import("@/lib/git-dates");
    if (isShallowRepo()) return; // A shallow CI checkout has no dates by design.
    expect(lastModified(["README.md"])).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});
