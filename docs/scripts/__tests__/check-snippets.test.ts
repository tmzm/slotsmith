import { describe, expect, it } from "vitest";
import { findUnbackedSnippets } from "../check-snippets.ts";

const sample = `import { DataTable } from "slotsmith";

export default function Demo() {
  return (
    <DataTable
      data={rows}
      columns={columns}
    />
  );
}
`;

const mdx = (lang: string, body: string) => `# Title\n\nSome prose.\n\n\`\`\`${lang}\n${body}\n\`\`\`\n\nMore prose.\n`;

describe("findUnbackedSnippets", () => {
  it("accepts a block that is part of a sample, whatever its indentation", () => {
    expect(findUnbackedSnippets(mdx("tsx", "<DataTable\n  data={rows}\n  columns={columns}\n/>"), [sample])).toEqual([]);
  });

  it("reports a block that no sample contains", () => {
    expect(findUnbackedSnippets(mdx("tsx", "<DataTable data={other} />"), [sample])).toEqual(["<DataTable data={other} />"]);
  });

  it("checks ts, jsx and css blocks too, with a title after the language", () => {
    const text = [mdx("ts", "const a = 1;"), mdx('jsx title="x.jsx"', "<A />"), mdx("css", ".a { color: red; }")].join("\n");
    expect(findUnbackedSnippets(text, [sample])).toHaveLength(3);
  });

  it("ignores bash and untyped blocks", () => {
    expect(findUnbackedSnippets(mdx("bash", "pnpm add slotsmith") + mdx("", "anything"), [sample])).toEqual([]);
  });

  it("reads an empty block as empty, without swallowing the prose and the next block", () => {
    const text = "```tsx\n```\n\nProse with <DataTable data={prose} /> in it.\n\n```tsx\n<DataTable data={other} />\n```\n";
    expect(findUnbackedSnippets(text, [sample])).toEqual(["<DataTable data={other} />"]);
  });

  it("fails an indented fence inside JSX and points to SampleCode", () => {
    const text = "<Tabs>\n  <Tab>\n    ```tsx\n    <DataTable data={rows} />\n    ```\n  </Tab>\n</Tabs>\n";
    const found = findUnbackedSnippets(text, [sample]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("use <SampleCode");
  });
});
