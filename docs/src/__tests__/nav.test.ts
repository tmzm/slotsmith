import { describe, expect, it } from "vitest";
import { NAV, type NavItem } from "@/nav";
import { en } from "@/i18n/messages.en";
import { COMPONENTS } from "@/data/components";

const flatten = (items: NavItem[]): NavItem[] => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
const items = flatten(NAV.flatMap((group) => group.items));

describe("NAV", () => {
  it("has the sidebar groups in order", () => {
    expect(NAV.map((group) => group.label)).toEqual([
      "nav.gettingStarted",
      "nav.components",
      "nav.guides",
      "nav.theming",
      "nav.languages",
      "nav.aiTools",
      "nav.trust",
      "nav.roadmap",
      "nav.comparison",
      "nav.changelog",
    ]);
  });

  it("uses language-neutral paths that start and end with a slash", () => {
    for (const item of items) {
      expect(item.path, item.label).toMatch(/^\/(.*\/)?$/);
      expect(item.path.startsWith("/ar/"), item.path).toBe(false);
    }
  });

  it("labels every entry with a message key", () => {
    for (const label of [...NAV.map((group) => group.label), ...items.map((item) => item.label)]) {
      expect(Object.keys(en), label).toContain(label);
    }
  });

  it("lists each component with its API, adapters and guides", () => {
    const components = NAV.find((group) => group.label === "nav.components");
    expect(components?.items.map((item) => item.path)).toEqual([
      "/components/data-table/",
      "/components/autocomplete/",
      "/components/date-picker/",
      "/components/file-uploader/",
    ]);
    for (const [index, item] of (components?.items ?? []).entries()) {
      const meta = COMPONENTS[index];
      expect(item.children?.map((child) => child.path)).toEqual([
        `${item.path}api/`,
        `${item.path}adapters/`,
        ...(meta?.guides.map((guide) => `${item.path}guides/${guide.slug}/`) ?? []),
      ]);
    }
  });
});
