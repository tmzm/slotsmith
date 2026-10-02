import { describe, expect, it } from "vitest";
import { findAnswerFirstProblems, findStructureProblems, OVERVIEW_HEADINGS } from "../check-structure.ts";

const OVERVIEW = "src/content/docs/en/components/data-table/index.mdx";
const GUIDE = "src/content/docs/en/components/data-table/guides/pagination.mdx";
const QUICK_START = "samples/data-table/quick-start.tsx";

const frontmatter = '---\ntitle: "Data table"\ndescription: "A table."\n---\n\n';
const overview = (headings: readonly string[]) =>
  frontmatter + "The data table renders rows.\n\n" + headings.map((h) => `## ${h}\n\nText.\n`).join("\n");

describe("findStructureProblems", () => {
  it("accepts an overview with every heading in order", () => {
    expect(findStructureProblems(OVERVIEW, overview(OVERVIEW_HEADINGS))).toEqual([]);
  });

  it("names the heading an overview is missing", () => {
    const problems = findStructureProblems(OVERVIEW, overview(OVERVIEW_HEADINGS.filter((h) => h !== "Adapters")));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Adapters");
  });

  it("reports headings out of order once", () => {
    const swapped = [...OVERVIEW_HEADINGS];
    [swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!];
    expect(findStructureProblems(OVERVIEW, overview(swapped))).toHaveLength(1);
  });

  it("ignores ## lines inside code fences and counts h3s as nothing", () => {
    const text = overview(OVERVIEW_HEADINGS) + "\n```md\n## Not a heading\n```\n\n### Sub\n";
    expect(findStructureProblems(OVERVIEW, text)).toEqual([]);
  });

  it("reports a guide with no live demo", () => {
    expect(findStructureProblems(GUIDE, frontmatter + "Pagination splits rows.\n\n## Page size\n")).toHaveLength(1);
    expect(findStructureProblems(GUIDE, frontmatter + 'Pagination splits rows.\n\n<Demo name="data-table/pagination" />\n')).toEqual([]);
  });

  it("reports a quick-start sample that imports a shared file", () => {
    const sample = 'import { DataTable } from "slotsmith/data-table";\nimport { people } from "../shared/people";\n';
    const problems = findStructureProblems(QUICK_START, sample);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("../shared/");
    expect(findStructureProblems(QUICK_START, 'import { DataTable } from "slotsmith/data-table";\n')).toEqual([]);
  });

  it("leaves other files alone", () => {
    expect(findStructureProblems("src/content/docs/en/theming.mdx", "## Anything\n")).toEqual([]);
    expect(findStructureProblems("samples/data-table/overview.tsx", 'import { people } from "../shared/people";\n')).toEqual([]);
  });

  it("checks Windows paths too", () => {
    expect(findStructureProblems(OVERVIEW.replaceAll("/", "\\"), frontmatter)).not.toEqual([]);
  });
});

describe("findAnswerFirstProblems", () => {
  const page = (body: string, title = "Data table") => `---\ntitle: "${title}"\ndescription: "A table."\n---\n\nimport X from "y";\n\n${body}`;

  it("ends the overview headings with FAQ", () => {
    expect(OVERVIEW_HEADINGS.at(-1)).toBe("FAQ");
  });

  it("accepts a short opening paragraph that names the subject", () => {
    expect(findAnswerFirstProblems(OVERVIEW, page("The data table renders rows with sorting and selection.\n\n## Overview\n"))).toEqual([]);
  });

  it("rejects a page that opens with a heading, a component, a list or code", () => {
    expect(findAnswerFirstProblems(OVERVIEW, page("## Heading\n\nThe data table renders rows.\n"))).toHaveLength(1);
    expect(findAnswerFirstProblems(OVERVIEW, page('<Demo name="x" />\n\nThe data table renders rows.\n'))).toHaveLength(1);
    expect(findAnswerFirstProblems(OVERVIEW, page("- The data table renders rows.\n"))).toHaveLength(1);
    expect(findAnswerFirstProblems(OVERVIEW, page("```tsx\nconst table = 1;\n```\n"))).toHaveLength(1);
  });

  it("rejects an opening paragraph over 50 words", () => {
    const long = `The data table ${"renders many rows ".repeat(20).trim()}.`;
    const problems = findAnswerFirstProblems(OVERVIEW, page(long));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("50");
  });

  it("rejects an opening that does not name the subject", () => {
    expect(findAnswerFirstProblems(OVERVIEW, page("Rows, sorted and selected.\n"))).toHaveLength(1);
  });

  it("accepts the component name as a guide's subject", () => {
    expect(findAnswerFirstProblems(GUIDE, page("The data table splits rows into pages.\n", "Pagination"))).toEqual([]);
  });

  it("leaves non-MDX files alone", () => {
    expect(findAnswerFirstProblems(QUICK_START, "## Not prose\n")).toEqual([]);
  });
});
