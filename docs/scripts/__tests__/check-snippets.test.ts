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
});
