import { describe, expect, it } from "vitest";
import { alternates, canonicalUrl, editUrl, pageTitle } from "@/lib/page";

describe("pageTitle", () => {
  it("appends the site name to a page title", () => {
    expect(pageTitle("en", "Theming")).toBe("Theming · slotsmith");
  });

  it("uses the positioning for the landing", () => {
    expect(pageTitle("en", null).startsWith("Finished data table, combobox, date picker and file uploader for React")).toBe(true);
  });
});

describe("canonicalUrl", () => {
  it("joins the site url and the language path", () => {
    expect(canonicalUrl("ar", "/theming/")).toBe("https://slotsmith-docs.netlify.app/ar/theming/");
    expect(canonicalUrl("en", "/")).toBe("https://slotsmith-docs.netlify.app/");
  });
});

describe("editUrl", () => {
  it("points at the source file on the default branch", () => {
    expect(editUrl("src/content/docs/en/theming.mdx")).toBe(
      "https://github.com/tmzm/slotsmith/edit/master/docs/src/content/docs/en/theming.mdx",
    );
  });
});

describe("alternates", () => {
  it("lists English, Arabic and x-default", () => {
    const links = alternates("/");
    expect(links).toHaveLength(3);
    const byLang = Object.fromEntries(links.map((link) => [link.hreflang, link.href]));
    expect(byLang.en).toBe("https://slotsmith-docs.netlify.app/");
    expect(byLang.ar).toBe("https://slotsmith-docs.netlify.app/ar/");
    expect(byLang["x-default"]).toBe(byLang.en);
  });
});
