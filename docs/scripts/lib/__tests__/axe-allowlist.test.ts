import { describe, expect, it } from "vitest";
import { KNOWN_LIBRARY_ISSUES, sortViolations, type KnownIssue } from "../axe-allowlist.ts";

const allowlist: KnownIssue[] = [{ rule: "nested-interactive", selector: ".sfu__zone", reason: "Dropzone is a button around the Browse button." }];

const violation = (id: string, ...targets: string[]) => ({ id, impact: "serious", help: `${id} help`, nodes: targets.map((target) => ({ target: [target] })) });

describe("sortViolations", () => {
  it("records an allowlisted violation as a known library issue, not a problem", () => {
    const { known, problems } = sortViolations([violation("nested-interactive", ".sfu__zone")], allowlist);
    expect(problems).toEqual([]);
    expect(known).toEqual([{ rule: "nested-interactive", target: ".sfu__zone", reason: allowlist[0]!.reason }]);
  });

  it("keeps a violation of another rule as a problem", () => {
    const { known, problems } = sortViolations([violation("color-contrast", ".sfu__zone")], allowlist);
    expect(known).toEqual([]);
    expect(problems).toEqual([{ id: "color-contrast", impact: "serious", help: "color-contrast help", targets: [".sfu__zone"] }]);
  });

  it("keeps the nodes of an allowlisted rule that the selector does not cover", () => {
    const { known, problems } = sortViolations([violation("nested-interactive", ".sfu__zone", ".sac__trigger")], allowlist);
    expect(known.map((issue) => issue.target)).toEqual([".sfu__zone"]);
    expect(problems.map((problem) => problem.targets)).toEqual([[".sac__trigger"]]);
  });

  it("matches the selector as a whole class, not a prefix", () => {
    const { problems } = sortViolations([violation("nested-interactive", ".sfu__zone-extra")], allowlist);
    expect(problems).toHaveLength(1);
  });
});

describe("KNOWN_LIBRARY_ISSUES", () => {
  it("gives every entry a rule, a selector and a reason", () => {
    expect(KNOWN_LIBRARY_ISSUES.length).toBeGreaterThan(0);
    for (const issue of KNOWN_LIBRARY_ISSUES) {
      expect(issue.rule).toMatch(/^[a-z-]+$/);
      expect(issue.selector).toMatch(/^\.[a-z_-]+$/);
      expect(issue.reason.length).toBeGreaterThan(10);
    }
  });
});
