import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTRIBUTES, BANNED_WORDS, CORRECTION_URL, SUBJECTS, type Cell } from "@/data/comparison";
import { PACKS } from "@/lib/packs";

const PAGE = readFileSync(new URL("../../content/docs/en/comparison.mdx", import.meta.url), "utf8");
const PACKAGE = JSON.parse(readFileSync(new URL("../../../../package.json", import.meta.url), "utf8")) as {
  license: string;
  peerDependencies: Record<string, string>;
};

/** Every source a cell names. */
const sources = (cell: Cell) => [cell.source, ...(cell.also ?? [])].filter((url): url is string => url !== undefined);
/** Everything a subject says in words: its cells, their notes and its own note. */
const words = (subject: (typeof SUBJECTS)[number]) => [subject.note ?? "", ...Object.values(subject.cells).flatMap((cell) => [cell.text, cell.note ?? ""])];

describe("comparison data", () => {
  it("compares slotsmith, first, with five other subjects", () => {
    expect(SUBJECTS).toHaveLength(6);
    expect(SUBJECTS[0]!.name).toBe("slotsmith");
    expect(SUBJECTS.map((subject) => subject.name).slice(1)).toEqual([
      "Material React Table",
      "Mantine React Table",
      "shadcn/ui data table",
      "React Aria Components",
      "Ark UI / Park UI",
    ]);
  });

  it("fills every attribute of every subject", () => {
    const keys = ATTRIBUTES.map((attribute) => attribute.key);
    expect(keys).toEqual(["components", "styling", "replaceParts", "builtOn", "dependencies", "license", "rtl", "virtualisation", "typescript"]);
    for (const subject of SUBJECTS) {
      expect(Object.keys(subject.cells).sort(), subject.name).toEqual([...keys].sort());
      for (const key of keys) expect(subject.cells[key].text.trim().length, `${subject.name} ${key}`).toBeGreaterThan(0);
    }
  });

  it("gives every cell of another project an https source", () => {
    for (const subject of SUBJECTS.slice(1)) {
      expect(subject.url, subject.name).toMatch(/^https:\/\//);
      for (const [key, cell] of Object.entries(subject.cells)) {
        expect(cell.source, `${subject.name} ${key}`).toMatch(/^https:\/\/\S+$/);
        for (const url of sources(cell)) expect(url, `${subject.name} ${key}`).toMatch(/^https:\/\/\S+$/);
      }
    }
  });

  it("links slotsmith's own cells to its docs pages", () => {
    for (const [key, cell] of Object.entries(SUBJECTS[0]!.cells)) expect(cell.source, key).toMatch(/^\/[a-z-/]*\/(#[a-z-]+)?$/);
  });

  it("dates every subject's check, never in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const subject of SUBJECTS) {
      expect(subject.checked, subject.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${subject.checked}T00:00:00Z`).toISOString().slice(0, 10), subject.name).toBe(subject.checked);
      expect(subject.checked <= today, `${subject.name} checked ${subject.checked}`).toBe(true);
    }
  });

  it("uses no word of praise or blame", () => {
    expect(BANNED_WORDS).toEqual(["best", "powerful", "beautiful", "simple", "easy", "blazing", "modern", "lightweight", "robust", "seamless", "elegant", "intuitive"]);
    const banned = new RegExp(`\b(${BANNED_WORDS.join("|")})\b`, "i");
    for (const subject of SUBJECTS) for (const text of words(subject)) expect(text, subject.name).not.toMatch(banned);
    expect(PAGE.replace(/^---[\s\S]*?---/, "")).not.toMatch(banned);
    for (const attribute of ATTRIBUTES) expect(attribute.label).not.toMatch(banned);
  });

  it("writes an unverified cell as Not documented", () => {
    for (const subject of SUBJECTS) for (const text of words(subject)) expect(text, subject.name).not.toMatch(/\b(unknown|probably|presumably|i think|n\/a)\b/i);
  });

  it("reads slotsmith's license, peers and right-to-left packs from the library", () => {
    const { cells } = SUBJECTS[0]!;
    expect(cells.license.text).toBe(PACKAGE.license);
    for (const [name, range] of Object.entries(PACKAGE.peerDependencies)) {
      expect(cells.dependencies.text).toContain(`\`${name}\``);
      expect(cells.dependencies.text).toContain(range);
    }
    const rtl = PACKS.filter((pack) => pack.dir === "rtl");
    expect(rtl.length).toBeGreaterThan(0);
    for (const pack of rtl) expect(cells.rtl.text).toContain(`\`${pack.code}\``);
  });
});

describe("comparison page", () => {
  it("is finished, shows the table and links to the correction issue", () => {
    expect(PAGE).not.toMatch(/^draft:\s*true/m);
    expect(PAGE).toContain("<ComparisonTable");
    expect(CORRECTION_URL).toBe("https://github.com/tmzm/slotsmith/issues/new?title=Comparison%20correction");
    expect(PAGE).toContain(CORRECTION_URL);
  });
});
