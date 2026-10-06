import { describe, expect, it } from "vitest";
import { groupResults, isSearchShortcut, nextActive, type SearchPage } from "@/lib/search";
import { searchMessages, searchSection } from "@/lib/search-messages";

const page = (url: string, section: string | undefined, subs: string[] = []): SearchPage => ({
  url,
  excerpt: `about <mark>${url}</mark>`,
  meta: { title: `Title ${url}`, section },
  sub_results: [{ title: `Title ${url}`, url, excerpt: "top" }, ...subs.map((id) => ({ title: id, url: `${url}#${id}`, excerpt: `in ${id}` }))],
});

describe("groupResults", () => {
  it("groups pages by section in the order sections first appear, keeping the ranking inside each", () => {
    const groups = groupResults([page("/a/", "Data table"), page("/b/", "Theming"), page("/c/", "Data table")], "slotsmith");
    expect(groups.map((group) => group.section)).toEqual(["Data table", "Theming"]);
    expect(groups[0]!.rows.map((row) => row.url)).toEqual(["/a/", "/c/"]);
  });

  it("lists at most two headings under a page, as nested rows linking to the heading, and never the page twice", () => {
    const [group] = groupResults([page("/a/", "Guides", ["one", "two", "three"])], "slotsmith");
    expect(group!.rows.map((row) => [row.url, row.nested])).toEqual([
      ["/a/", false],
      ["/a/#one", true],
      ["/a/#two", true],
    ]);
  });

  it("gives every row and group its own id, and names the group of a page with no section", () => {
    const groups = groupResults([page("/a/", undefined, ["one"]), page("/b/", "Theming", ["one"])], "slotsmith");
    const ids = [...groups.map((group) => group.id), ...groups.flatMap((group) => group.rows.map((row) => row.id))];
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups[0]!.section).toBe("slotsmith");
  });

  it("falls back to the URL for a page with no title", () => {
    const [group] = groupResults([{ url: "/a/", excerpt: "", meta: {} }], "slotsmith");
    expect(group!.rows[0]!.title).toBe("/a/");
  });
});

describe("isSearchShortcut", () => {
  const press = (key: string, more: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; target: EventTarget | null }> = {}) =>
    isSearchShortcut({ key, ctrlKey: false, metaKey: false, altKey: false, target: null, ...more });

  it("accepts Ctrl+K and ⌘K in either case, and a bare slash", () => {
    expect(press("k", { ctrlKey: true })).toBe(true);
    expect(press("K", { metaKey: true })).toBe(true);
    expect(press("/")).toBe(true);
  });

  it("rejects a bare K, Ctrl+slash and anything with Alt", () => {
    expect(press("k")).toBe(false);
    expect(press("/", { ctrlKey: true })).toBe(false);
    expect(press("k", { ctrlKey: true, altKey: true })).toBe(false);
  });
});

describe("nextActive", () => {
  it("moves and wraps with the arrows, jumps with Home and End", () => {
    expect(nextActive(0, 3, "ArrowDown")).toBe(1);
    expect(nextActive(2, 3, "ArrowDown")).toBe(0);
    expect(nextActive(0, 3, "ArrowUp")).toBe(2);
    expect(nextActive(1, 3, "Home")).toBe(0);
    expect(nextActive(1, 3, "End")).toBe(2);
  });

  it("is undefined for other keys and for an empty list", () => {
    expect(nextActive(0, 3, "a")).toBeUndefined();
    expect(nextActive(0, 0, "ArrowDown")).toBeUndefined();
  });
});

describe("searchSection", () => {
  it("names a component page by its component and other pages by their sidebar group", () => {
    expect(searchSection("en", "/components/data-table/guides/row-reorder/")).toBe("Data table");
    expect(searchSection("en", "/components/date-picker/api/")).toBe("Date picker");
    expect(searchSection("en", "/theming/")).toBe("Theming");
  });

  it("is in the page's language, and falls back to the site name for a page outside the sidebar", () => {
    expect(searchSection("ar", "/theming/")).not.toBe(searchSection("en", "/theming/"));
    expect(searchSection("en", "/about/")).toBe("slotsmith");
  });
});

describe("searchMessages", () => {
  it("has every text in both languages, with the placeholders the dialog fills", () => {
    for (const lang of ["en", "ar"] as const) {
      const messages = searchMessages(lang);
      for (const text of Object.values(messages)) expect(text).not.toBe("");
      expect(messages.empty).toContain("{query}");
      expect(messages.count).toContain("{count}");
    }
  });
});
