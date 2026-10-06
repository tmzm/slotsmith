import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { README_ANCHOR_PATHS, hasNotes, latestVersion, parseChangelog, releaseId, resolveReadmeLinks } from "@/lib/changelog";
import { COMPONENTS } from "@/data/components";
import { DOC_SLUGS } from "@/lib/pages";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const readme = read("../../../../README.md");
const releases = parseChangelog(readme);

/** The README's own changelog section, as text. */
const section = readme.slice(readme.indexOf("\n## Changelog"), readme.indexOf("\n## Author"));

describe("parseChangelog on the real README", () => {
  it("reads every release the section names, newest first", () => {
    const named = [...section.matchAll(/^- \*\*([^*]+)\*\*/gm)].map(([, heading]) => heading);
    expect(named.length).toBeGreaterThan(2);
    expect(releases.map((release) => release.version)).toEqual(named);
  });

  it("marks only an Unreleased entry as unreleased, and puts it first", () => {
    const unreleased = releases.filter((release) => release.unreleased);
    expect(unreleased.length).toBeLessThanOrEqual(1);
    if (unreleased.length === 1) expect(releases[0]).toBe(unreleased[0]);
    for (const release of releases) expect(release.unreleased).toBe(/^unreleased$/i.test(release.version));
  });

  it("has the 1.6.0 release with its notes", () => {
    const release = releases.find((r) => r.version === "1.6.0");
    expect(release?.unreleased).toBe(false);
    expect(release?.markdown).toMatch(/^- Drag-to-reorder rows/);
    // Its later bullets belong to it, not to a release of their own.
    expect(release?.markdown).toContain("- Six ready-made themes");
    expect(release?.markdown).not.toContain("**1.5.0**");
  });

  it("keeps every line of the section in exactly one release", () => {
    const bullets = section.split("\n").filter((line) => line.startsWith("- ")).length;
    const kept = releases.flatMap((release) => release.markdown.split("\n")).filter((line) => line.startsWith("- ")).length;
    expect(kept).toBe(bullets);
  });

  it("names a released version as the latest", () => {
    expect(latestVersion(releases)).toMatch(/^\d+\.\d+\.\d+$/);
    expect(latestVersion(releases)).toBe(releases.find((release) => !release.unreleased)?.version);
  });

  it("maps every README anchor the notes link to onto a page the site has", () => {
    const pages = new Set([
      ...DOC_SLUGS.map((slug) => `/${slug}/`),
      ...COMPONENTS.flatMap((c) => [`/components/${c.slug}/`, ...c.guides.map((g) => `/components/${c.slug}/guides/${g.slug}/`)]),
    ]);
    const anchors = new Set(releases.flatMap((release) => [...release.markdown.matchAll(/\]\(#([^)\s]+)\)/g)].map(([, anchor]) => anchor!)));
    expect(anchors.size).toBeGreaterThan(0);
    for (const anchor of anchors) expect(README_ANCHOR_PATHS, `README anchor #${anchor}`).toHaveProperty(anchor);
    for (const path of Object.values(README_ANCHOR_PATHS)) expect(pages, path).toContain(path);
  });
});

describe("parseChangelog", () => {
  it("returns nothing for a README without a changelog", () => {
    expect(parseChangelog("# lib\n\n## Install\n\nnpm i lib\n")).toEqual([]);
    expect(parseChangelog("")).toEqual([]);
  });

  it("reads `###` headings and keeps nested lists and fenced code", () => {
    const fixture = [
      "# lib",
      "",
      "## Changelog",
      "",
      "### Unreleased",
      "",
      "- A fix:",
      "  - nested one",
      "  - nested two",
      "",
      "### 2.0.0",
      "",
      "Renamed the prop:",
      "",
      "```tsx",
      "## not a heading",
      "### 9.9.9",
      "- **8.8.8** — not a release",
      "<Table rows={rows} />",
      "```",
      "",
      "## License",
      "",
      "MIT",
    ].join("\n");
    expect(parseChangelog(fixture)).toEqual([
      { version: "Unreleased", unreleased: true, markdown: "- A fix:\n  - nested one\n  - nested two" },
      {
        version: "2.0.0",
        unreleased: false,
        markdown: "Renamed the prop:\n\n```tsx\n## not a heading\n### 9.9.9\n- **8.8.8** — not a release\n<Table rows={rows} />\n```",
      },
    ]);
  });

  it("reads bullet releases, with nested lists and code under a bullet", () => {
    const fixture = [
      "## Changelog",
      "",
      "- **Unreleased** — First change.",
      "- Second change:",
      "  - nested",
      "",
      "  ```css",
      "  .a { color: red; }",
      "  ```",
      "",
      "- **1.2.0**: Colon form.",
      "- **1.1.0**",
      "- Bare form.",
      "- **Note:** bold text that is not a version starts no release.",
    ].join("\n");
    expect(parseChangelog(fixture)).toEqual([
      { version: "Unreleased", unreleased: true, markdown: "- First change.\n- Second change:\n  - nested\n\n  ```css\n  .a { color: red; }\n  ```" },
      { version: "1.2.0", unreleased: false, markdown: "- Colon form." },
      { version: "1.1.0", unreleased: false, markdown: "- Bare form.\n- **Note:** bold text that is not a version starts no release." },
    ]);
  });

  it("keeps an Unreleased entry with no notes, with empty markdown, for the pages to leave out", () => {
    expect(parseChangelog("## Changelog\n\n- **Unreleased** —\n\n- **1.0.0** — First.\n").map(hasNotes)).toEqual([false, true]);
    expect(parseChangelog("## Changelog\n\n### Unreleased\n\n### 1.0.0\n\n- First.\n")).toEqual([
      { version: "Unreleased", unreleased: true, markdown: "" },
      { version: "1.0.0", unreleased: false, markdown: "- First." },
    ]);
    expect(latestVersion(parseChangelog("## Changelog\n\n### Unreleased\n"))).toBeNull();
  });

  it("stops at the next `##` section, also at the end of the file", () => {
    expect(parseChangelog("## Changelog\n\n### 1.0.0\n\n- Only.")).toEqual([{ version: "1.0.0", unreleased: false, markdown: "- Only." }]);
    expect(parseChangelog("## Changelog\n\n### 1.0.0\n\n- Only.\n\n## Changelog notes\n\n### 0.1.0\n")).toHaveLength(1);
  });
});

describe("releaseId", () => {
  it("is the version, or `unreleased`", () => {
    expect(releaseId({ version: "1.6.0", unreleased: false })).toBe("1.6.0");
    expect(releaseId({ version: "Unreleased", unreleased: true })).toBe("unreleased");
  });
});

describe("resolveReadmeLinks", () => {
  it("rewrites README anchors and leaves other links alone", () => {
    const out = resolveReadmeLinks("See [Theming](#theming), [x](#gone), [npm](https://npmjs.com) and `[a](#b)`.", (anchor) =>
      anchor === "theming" ? "/theming/" : `https://example.test#${anchor}`,
    );
    expect(out).toBe("See [Theming](/theming/), [x](https://example.test#gone), [npm](https://npmjs.com) and `[a](#b)`.");
  });
});
