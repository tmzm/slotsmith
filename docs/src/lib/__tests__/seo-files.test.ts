import { describe, expect, it } from "vitest";
import { renderLlms, renderLlmsFull, renderRobots, renderSitemap } from "@/lib/seo-files";
import { t } from "@/i18n";

const page = (path: string, kind: "landing" | "doc" | "component" | "guide" | "api" | "adapters" = "doc") => ({
  path,
  lang: "en" as const,
  title: `Title of ${path}`,
  description: `About ${path}.`,
  kind,
});

describe("renderSitemap", () => {
  const xml = renderSitemap([{ path: "/theming/", lang: "en" }]);

  it("lists the page in both languages with absolute, trailing-slash URLs", () => {
    expect(xml).toContain("<loc>https://slotsmith.dev/theming/</loc>");
    expect(xml).toContain("<loc>https://slotsmith.dev/ar/theming/</loc>");
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });

  it("gives every URL its en, ar and x-default alternates", () => {
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://slotsmith.dev/theming/"/>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ar" href="https://slotsmith.dev/ar/theming/"/>');
    expect(xml).toContain('hreflang="x-default" href="https://slotsmith.dev/theming/"');
    expect(xml.match(/hreflang="x-default"/g)).toHaveLength(2);
  });

  it("is a urlset with the xhtml namespace, one entry per path however many languages list it", () => {
    const both = renderSitemap([
      { path: "/", lang: "en" },
      { path: "/", lang: "ar" },
    ]);
    expect(both.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset')).toBe(true);
    expect(both).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(both.match(/<url>/g)).toHaveLength(2);
    expect(both).toContain("<loc>https://slotsmith.dev/ar/</loc>");
  });
});

describe("renderRobots", () => {
  it("allows everything and names the sitemap", () => {
    const robots = renderRobots();
    expect(robots).toContain("User-agent: *\nAllow: /\n");
    expect(robots).toContain("Sitemap: https://slotsmith.dev/sitemap.xml\n");
  });
});

describe("renderLlms", () => {
  const text = renderLlms([page("/", "landing"), page("/theming/"), page("/components/data-table/", "component"), { ...page("/ar/theming/"), lang: "ar" }]);

  it("starts with the name and the positioning quote", () => {
    expect(text.startsWith(`# slotsmith\n\n> ${t("en", "site.positioning")}\n`)).toBe(true);
  });

  it("links English pages only, with their descriptions, grouped by kind", () => {
    expect(text).not.toContain("/ar/");
    expect(text).toMatch(/## Docs\n[\s\S]*- \[Title of \/theming\/\]\(https:\/\/slotsmith\.dev\/theming\/\): About \/theming\/\./);
    expect(text).toMatch(/## Components\n[\s\S]*Title of \/components\/data-table\//);
  });
});

describe("renderLlmsFull", () => {
  it("joins the sections under their titles and URLs", () => {
    const text = renderLlmsFull([
      { title: "Theming", url: "https://slotsmith.dev/theming/", markdown: "# Theming\n\nTokens." },
      { title: "Data table API", url: "https://slotsmith.dev/components/data-table/api/", markdown: "# Data table API\n\n| a |" },
    ]);
    expect(text.startsWith("# slotsmith\n")).toBe(true);
    expect(text).toContain("Source: https://slotsmith.dev/theming/\n\n# Theming\n\nTokens.");
    expect(text.indexOf("Theming")).toBeLessThan(text.indexOf("Data table API"));
  });
});
