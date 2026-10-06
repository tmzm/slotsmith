import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Base from "@/layouts/Base.astro";
import { searchMessages } from "@/lib/search-messages";

let container: AstroContainer;
const pages: Record<"en" | "ar", string> = { en: "", ar: "" };

beforeAll(async () => {
  container = await AstroContainer.create();
  for (const lang of ["en", "ar"] as const) {
    pages[lang] = await container.renderToString(Base, { props: { lang, title: "Page", description: "A page.", path: "/theming/" } });
  }
});

const tag = (html: string, pattern: RegExp) => html.match(pattern)?.[0] ?? "";

describe("Search markup", () => {
  it("renders the header button hidden, inside the search slot, as a control that opens search", () => {
    const slot = tag(pages.en, /<div id="search-slot"[^>]*>[\s\S]*?<\/div>/);
    const button = tag(slot, /<button[^>]*data-search-trigger[^>]*>/);
    expect(button).toMatch(/\shidden(\s|>|=)/);
    expect(button).toContain("data-search-open");
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-keyshortcuts="Control+K Meta+K /"');
    expect(slot).toContain("Search");
  });

  it("gives the dock a search control too, and marks none ready before the loader runs", () => {
    expect(pages.en.match(/<button[^>]*data-search-open/g)).toHaveLength(2);
    expect(pages.en).not.toMatch(/<button[^>]*data-search-ready/);
  });

  it("hides every search control when scripts are off", () => {
    expect(pages.en).toMatch(/<noscript><style>\s*\[data-search-open\]\s*\{\s*display:\s*none\s*!important;?\s*\}\s*<\/style><\/noscript>/);
  });

  it("passes the dialog its language and messages as JSON", () => {
    for (const lang of ["en", "ar"] as const) {
      const json = pages[lang].match(/<script type="application\/json" id="search-data">([\s\S]*?)<\/script>/)?.[1] ?? "";
      expect(JSON.parse(json)).toEqual({ lang, messages: searchMessages(lang) });
      // No "<" in the data, so no message text can end the script element.
      expect(json).not.toContain("<");
    }
  });
});
