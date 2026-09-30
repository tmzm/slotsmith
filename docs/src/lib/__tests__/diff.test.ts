import { describe, expect, it } from "vitest";
import { diffLines } from "@/lib/diff";

describe("diffLines", () => {
  it("marks a changed line as removed from the base and added in the next text", () => {
    expect(diffLines("a\nb\nc", "a\nx\nc")).toEqual({ added: [2], removed: [2] });
  });

  it("finds nothing between identical texts", () => {
    expect(diffLines("a\nb\nc", "a\nb\nc")).toEqual({ added: [], removed: [] });
  });

  it("numbers inserted lines in the next text and deleted lines in the base", () => {
    expect(diffLines("a\nb\nc", "a\nb\nnew\nc")).toEqual({ added: [3], removed: [] });
    expect(diffLines("a\nb\nc", "a\nc")).toEqual({ added: [], removed: [2] });
  });

  it("marks the import and the components line of a swap sample, nothing else", () => {
    const base = 'import { DataTable } from "x";\nimport { people } from "y";\n\n<DataTable data={people} />';
    const next = 'import { DataTable } from "x";\nimport { mui } from "m";\nimport { people } from "y";\n\n<DataTable data={people} components={mui} />';
    expect(diffLines(base, next)).toEqual({ added: [2, 5], removed: [4] });
  });
});
