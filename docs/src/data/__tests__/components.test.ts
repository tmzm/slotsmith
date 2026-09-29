import { describe, expect, it } from "vitest";
import { COMPONENTS, componentPaths, guidePaths } from "@/data/components";
import { en } from "@/i18n/messages.en";
import { ar } from "@/i18n/messages.ar";

describe("COMPONENTS", () => {
  it("lists the four components in order", () => {
    expect(COMPONENTS.map((c) => c.slug)).toEqual(["data-table", "autocomplete", "date-picker", "file-uploader"]);
  });

  it("has unique guide slugs per component", () => {
    for (const meta of COMPONENTS) {
      const slugs = meta.guides.map((g) => g.slug);
      expect(new Set(slugs).size, meta.slug).toBe(slugs.length);
    }
  });

  it("uses title and summary keys that exist in both catalogs", () => {
    const keys = COMPONENTS.flatMap((c) => [c.title, c.summary, ...c.guides.map((g) => g.title)]);
    for (const key of keys) {
      expect(Object.keys(en), key).toContain(key);
      expect(Object.keys(ar), key).toContain(key);
    }
  });
});

describe("static paths", () => {
  it("has one component entry per language", () => {
    expect(componentPaths()).toHaveLength(8);
  });

  it("has (8 + 7 + 5 + 7) x 2 guide entries", () => {
    const paths = guidePaths();
    expect(paths).toHaveLength(54);
    expect(new Set(paths.map((p) => `${p.params.lang}/${p.params.component}/${p.params.guide}`)).size).toBe(54);
  });
});
