import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMPONENTS } from "@/data/components";
import { IGNORED_TODOS, ROADMAP, roadmapId } from "@/data/roadmap";
import { en } from "@/i18n/messages.en";
import { DOC_SLUGS } from "@/lib/pages";
import { findTodoTags } from "@/lib/todos";

const SRC = fileURLToPath(new URL("../../../../src", import.meta.url));

/** Every `.ts` and `.tsx` file of the library, tests left out, with its path from the repository root. */
function librarySources(dir = SRC): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : librarySources(full);
    if (!/\.tsx?$/.test(entry.name)) return [];
    return [{ path: `src${full.slice(SRC.length).split(sep).join("/")}`, text: readFileSync(full, "utf8") }];
  });
}

const tags = findTodoTags(librarySources());
const planned = ROADMAP.filter((item) => item.status === "planned");

describe("findTodoTags", () => {
  it("collects each tag with the files that carry it, each file once", () => {
    const found = findTodoTags([
      { path: "a.ts", text: "// TODO(calendars): one\n// TODO(calendars): two\n// TODO(server-locales): x" },
      { path: "b.tsx", text: "/* TODO(calendars) */ // TODO: untagged // TODO(Not_A_Tag)" },
    ]);
    expect([...found]).toEqual([
      ["calendars", ["a.ts", "b.tsx"]],
      ["server-locales", ["a.ts"]],
    ]);
  });

  it("finds nothing in files without tags", () => {
    expect(findTodoTags([{ path: "a.ts", text: "const todo = 1;" }]).size).toBe(0);
    expect(findTodoTags([]).size).toBe(0);
  });
});

describe("ROADMAP against the library's source", () => {
  it("reads the library's source", () => {
    expect(librarySources().length).toBeGreaterThan(50);
    expect(librarySources().some((file) => file.path.includes("__tests__"))).toBe(false);
  });

  it("has an entry, or a stated reason to ignore, for every TODO tag in the source", () => {
    const known = new Set([...ROADMAP.flatMap((item) => (item.todo ? [item.todo] : [])), ...IGNORED_TODOS]);
    for (const [tag, paths] of tags) expect(known, `TODO(${tag}) in ${paths.join(", ")} has no roadmap entry`).toContain(tag);
  });

  it("names only TODO tags the source still carries, so finished work moves to shipped", () => {
    for (const item of ROADMAP) if (item.todo) expect([...tags.keys()], `ROADMAP names TODO(${item.todo})`).toContain(item.todo);
    for (const tag of IGNORED_TODOS) expect([...tags.keys()], `IGNORED_TODOS names TODO(${tag})`).toContain(tag);
  });

  it("gives every planned item a stable id: its TODO tag, or one of its own when the source has no tag for it", () => {
    expect(planned.length).toBeGreaterThan(0);
    for (const item of planned) {
      expect(roadmapId(item), item.title).toMatch(/^[a-z0-9-]+$/);
      // One or the other: an item with a tag takes its id from the tag.
      expect(Boolean(item.todo) !== Boolean(item.id), item.title).toBe(true);
    }
    const ids = planned.map(roadmapId);
    expect(new Set(ids).size).toBe(ids.length);
    // Section ids on the page.
    for (const id of ids) expect(["in-progress", "planned", "shipped"]).not.toContain(id);
    const todos = ROADMAP.flatMap((item) => (item.todo ? [item.todo] : []));
    expect(new Set(todos).size).toBe(todos.length);
  });
});

describe("ROADMAP", () => {
  it("leaves work in progress to the changelog's unreleased notes", () => {
    expect(ROADMAP.some((item) => item.status === "in-progress")).toBe(false);
  });

  it("lists the plans the author has stated first, then the ones the source marks", () => {
    expect(planned.map(roadmapId)).toEqual(["excel-mode", "render-performance", "calendars", "server-locales", "reorder-sorting"]);
  });

  it("ships the four components, each linking to its page", () => {
    const shipped = ROADMAP.filter((item) => item.status === "shipped");
    for (const component of COMPONENTS) expect(shipped.map((item) => item.link)).toContain(`/components/${component.slug}/`);
    for (const item of shipped) expect(item.link, item.title).toBeTruthy();
  });

  it("links only to pages the site has", () => {
    const pages = new Set([
      ...DOC_SLUGS.map((slug) => `/${slug}/`),
      ...COMPONENTS.flatMap((c) => [`/components/${c.slug}/`, ...c.guides.map((g) => `/components/${c.slug}/guides/${g.slug}/`)]),
    ]);
    for (const item of ROADMAP) if (item.link) expect(pages, `${item.title} links to ${item.link}`).toContain(item.link.split("#")[0]);
  });

  it("has a message for every title and detail, and no date in any of them", () => {
    for (const item of ROADMAP) {
      for (const key of [item.title, item.detail]) {
        if (!key) continue;
        expect(en[key], key).toBeTruthy();
        expect(en[key], key).not.toMatch(/\b20\d\d\b|\bQ[1-4]\b|next (?:week|month|quarter|year)|soon/i);
      }
    }
  });
});
