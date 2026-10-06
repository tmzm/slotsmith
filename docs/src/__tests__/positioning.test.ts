import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE } from "../../site.config.ts";
import { t } from "@/i18n";
import { pageTitle } from "@/lib/page";
import { buildPages } from "@/lib/pages";

const read = (path: string) => readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), "utf8");

/** The positioning as the landing shows it: the hero's sentence, then its lede. */
const FIRST = t("en", "site.positioning");
const POSITIONING = `${FIRST} ${t("en", "hero.lede")}`;

const readme = read("README.md");
const manifest = JSON.parse(read("package.json")) as { description: string; homepage: string };
const aiManifest = JSON.parse(read("packages/ai/package.json")) as { homepage: string };

describe("the positioning", () => {
  it("is the landing's two sentences", () => {
    expect(POSITIONING).toBe(
      "Finished data table, combobox, date picker and file uploader for React that drop into any design system: shadcn/ui, MUI, Chakra, Ant Design or your own. Every part is a slot; what you don't replace still looks finished.",
    );
  });

  it("is the package description", () => {
    expect(manifest.description).toBe(POSITIONING);
  });

  it("is the README's first paragraph", () => {
    const paragraphs = readme
      .split(/\r?\n\s*\r?\n/)
      .map((block) => block.trim())
      .filter((block) => block !== "" && !/^[<#\[]|^---$/.test(block));
    expect(paragraphs[0]).toBe(POSITIONING);
  });

  it("opens the landing's title and meta description", () => {
    expect(pageTitle("en", null).startsWith(FIRST)).toBe(true);
    const landing = buildPages(() => undefined, []).find((page) => page.lang === "en" && page.path === "/")!;
    expect(landing.description).toContain(FIRST);
  });
});

describe("links to the docs", () => {
  it("has no hash-router link in the README", () => {
    expect(readme).not.toContain("/#/");
    expect(readme).not.toContain("netlify.app/#");
  });

  const siteHost = new URL(SITE.url).host;
  const links = [...readme.matchAll(/\]\((https?:\/\/[^)\s]*slotsmith[^)\s]*)\)/g)].map((match) => match[1]!).filter((url) => new URL(url).host === siteHost);

  it("points every README docs link at a path under the site url", () => {
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) {
      expect(link.startsWith(`${SITE.url}/`), link).toBe(true);
      expect(new URL(link).pathname.endsWith("/"), link).toBe(true);
    }
  });

  it("links only to pages the site builds", () => {
    // Every page's path, with a stand-in prose entry wherever an English MDX file exists.
    const lookup = (id: string) => (existsSync(fileURLToPath(new URL(`../content/docs/${id}.mdx`, import.meta.url))) ? ({ id, data: { title: id, description: id }, body: "" } as never) : undefined);
    const paths = new Set(buildPages(lookup).map((page) => page.path));
    for (const link of links) expect(paths.has(new URL(link).pathname), link).toBe(true);
  });

  it("sets the homepages from the site url, with no hash", () => {
    expect(manifest.homepage).toBe(`${SITE.url}/`);
    expect(aiManifest.homepage).toBe(`${SITE.url}/ai-tools/`);
    expect(aiManifest.homepage).not.toContain("#");
  });
});

describe("README sizes", () => {
  it("leaves the measured sizes to the Trust page", () => {
    expect(readme).toContain(`${SITE.url}/trust/#sizes`);
    // The changelog records history, sizes included; only the README's own prose defers to the Trust page.
    const prose = readme.split(/^## Changelog\b/m)[0]!;
    expect(prose).not.toMatch(/\d+(?:\.\d+)? ?KB/i);
  });
});
