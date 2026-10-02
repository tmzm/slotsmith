import { describe, expect, it } from "vitest";
import { pageMarkdown } from "@/lib/markdown";
import type { PageInfo } from "@/lib/pages";
import { sampleSource } from "@/lib/samples";

const prosePage = (body: string, data: Record<string, unknown> = {}): PageInfo => ({
  path: "/theming/",
  lang: "en",
  title: "Theming",
  description: "Tokens and themes.",
  kind: "doc",
  stub: false,
  sources: [],
  prose: {
    entry: { id: "en/theming", body, data: { title: "Theming", description: "Tokens and themes.", ...data } } as never,
    lang: "en",
    translated: true,
    sourcePath: "src/content/docs/en/theming.mdx",
  },
});

describe("pageMarkdown", () => {
  it("opens with the title and the description, and shows a demo as its sample's code", async () => {
    const markdown = await pageMarkdown(prosePage('Theming sets the tokens.\n\n<Demo name="landing/hero-table" height="20rem" />\n'));
    expect(markdown.startsWith("# Theming\n\n> Tokens and themes.\n")).toBe(true);
    expect(markdown).toContain("Theming sets the tokens.");
    expect(markdown).toContain("```tsx\n" + sampleSource("landing/hero-table").code.trim() + "\n```");
    expect(markdown).not.toContain("<Demo");
  });

  it("drops imports and comments, keeps a note's text and makes links absolute", async () => {
    const body = 'import X from "y";\n\n{/* hidden */}\nSee [pagination](./guides/pagination/) and [theming](/theming/).\n\n<Note kind="limitation">\n- One thing.\n</Note>\n';
    const markdown = await pageMarkdown(prosePage(body));
    expect(markdown).not.toContain("import X");
    expect(markdown).not.toContain("hidden");
    expect(markdown).toContain("[pagination](https://slotsmith.dev/theming/guides/pagination/)");
    expect(markdown).toContain("[theming](https://slotsmith.dev/theming/)");
    expect(markdown).toContain("- One thing.");
    expect(markdown).not.toContain("<Note");
  });

  it("renders a keyboard table and the frontmatter FAQ as Markdown", async () => {
    const body = 'Keys.\n\n<KeyboardTable rows={[\n  { keys: ["Space", "Enter"], action: "Lift the row." },\n]} />\n\n## FAQ\n\n<Faq />\n';
    const markdown = await pageMarkdown(prosePage(body, { faq: [{ q: "Does it sort?", a: "Yes.", link: "/components/data-table/guides/sorting-and-selection/" }] }));
    expect(markdown).toContain("| Keys | Action |");
    expect(markdown).toContain("| Space, Enter | Lift the row. |");
    expect(markdown).toContain("### Does it sort?\n\nYes. See https://slotsmith.dev/components/data-table/guides/sorting-and-selection/");
  });

  it("says a stub is being written", async () => {
    const stub: PageInfo = { path: "/roadmap/", lang: "en", title: "Roadmap", description: "Next.", kind: "doc", stub: true, sources: [] };
    expect(await pageMarkdown(stub)).toBe("# Roadmap\n\n> Next.\n\nThis page is being written.\n");
  });

  it("renders an API page from the generated reference", async () => {
    const api: PageInfo = {
      path: "/components/data-table/api/",
      lang: "en",
      title: "Data table API",
      description: "Props.",
      kind: "api",
      stub: false,
      component: "data-table",
      sources: [],
    };
    const markdown = await pageMarkdown(api);
    expect(markdown).toContain("## Slots");
    expect(markdown).toContain("## Props");
    expect(markdown).toContain("| `data` |");
    expect(markdown).toContain("## Labels");
  });
});
