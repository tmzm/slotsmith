import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { latestVersion, parseChangelog } from "@/lib/changelog";
import { DOC_SLUGS, OWN_TEMPLATE_DOCS, buildPages } from "@/lib/pages";
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

describe("the changelog page", () => {
  const changelog = entry("en/changelog", { title: "Changelog", description: "Every release. The latest release is {version}." });
  const pages = buildPages((id) => (id === "en/changelog" ? changelog : lookup(id)), ["theming", "changelog"]);
  const latest = latestVersion(parseChangelog(readFileSync(fileURLToPath(new URL("../../../../README.md", import.meta.url)), "utf8")));

  it("names the README's latest release in its description, in both languages", () => {
    expect(latest).toMatch(/^\d+\.\d+\.\d+$/);
    for (const page of pages.filter((p) => p.path === "/changelog/")) expect(page.description).toBe(`Every release. The latest release is ${latest}.`);
    expect(pages.find((p) => p.path === "/theming/")!.description).toBe("Tokens and themes.");
  });

  it("is dated by the README as well as its own prose", () => {
    expect(pages.find((p) => p.path === "/changelog/")!.sources).toContain("README.md");
    expect(pages.find((p) => p.path === "/theming/")!.sources).not.toContain("README.md");
  });

  it("has a template of its own, as every page `[doc]` leaves out does", () => {
    expect(OWN_TEMPLATE_DOCS.every((slug) => (DOC_SLUGS as readonly string[]).includes(slug))).toBe(true);
    for (const slug of OWN_TEMPLATE_DOCS) expect(existsSync(fileURLToPath(new URL(`../../pages/[...lang]/${slug}/index.astro`, import.meta.url))), slug).toBe(true);
  });
});
