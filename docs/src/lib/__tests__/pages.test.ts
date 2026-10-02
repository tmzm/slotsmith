import { describe, expect, it } from "vitest";
import { buildPages } from "@/lib/pages";
import { COMPONENTS } from "@/data/components";

const entry = (id: string, data: { title: string; description: string; draft?: boolean }) => ({ id, data, body: "" }) as never;
const entries: Record<string, ReturnType<typeof entry>> = {
  "en/theming": entry("en/theming", { title: "Theming", description: "Tokens and themes." }),
  "en/roadmap": entry("en/roadmap", { title: "Roadmap", description: "Next.", draft: true }),
  "en/components/data-table": entry("en/components/data-table", { title: "Data table", description: "The table." }),
};
const lookup = (id: string) => entries[id];

describe("buildPages", () => {
  const pages = buildPages(lookup, ["theming", "roadmap"]);

  it("lists every page in both languages", () => {
    const guides = COMPONENTS.reduce((sum, c) => sum + c.guides.length, 0);
    expect(pages).toHaveLength(2 * (1 + 2 + COMPONENTS.length * 3 + guides));
    expect(pages.filter((p) => p.lang === "ar").map((p) => p.path)).toContain("/theming/");
  });

  it("takes titles and descriptions from the prose, and falls back to the catalog", () => {
    const theming = pages.find((p) => p.path === "/theming/" && p.lang === "en")!;
    expect(theming).toMatchObject({ title: "Theming", description: "Tokens and themes.", kind: "doc", stub: false });
    expect(pages.find((p) => p.path === "/components/data-table/")).toMatchObject({ title: "Data table", kind: "component", stub: false });
    expect(pages.find((p) => p.path === "/components/autocomplete/" && p.lang === "en")).toMatchObject({ title: "Autocomplete", stub: true });
    expect(pages.find((p) => p.path === "/components/data-table/api/" && p.lang === "en")).toMatchObject({ title: "Data table API", kind: "api" });
  });

  it("marks drafts and missing prose as stubs, never the landing", () => {
    expect(pages.find((p) => p.path === "/roadmap/")!.stub).toBe(true);
    expect(pages.find((p) => p.path === "/components/data-table/guides/pagination/")!).toMatchObject({ kind: "guide", stub: true });
    expect(pages.find((p) => p.path === "/" && p.lang === "en")).toMatchObject({ kind: "landing", stub: false, title: "slotsmith" });
  });
});
