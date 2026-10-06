import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types; the repo root has it as a dev dependency.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import A11yResults from "@/components/trust/A11yResults.astro";
import CoverageTable from "@/components/trust/CoverageTable.astro";
import Requirements from "@/components/trust/Requirements.astro";
import SizesTable from "@/components/trust/SizesTable.astro";
import SuitesList from "@/components/trust/SuitesList.astro";
import TestsSummary from "@/components/trust/TestsSummary.astro";
import type { Facts } from "@/lib/facts";
import { trustMarkdown } from "@/lib/markdown";
import { groupTitles } from "@/lib/trust";
import { SITE } from "../../../../site.config.ts";
import { A11Y_END_MARKER, A11Y_MARKER } from "../../../../scripts/lib/a11y-report.ts";

const BUNDLE_GROUPS = [
  { name: "what an app bundles", tests: ["drops everything but DataTable", "keeps what the app imports"] },
  { name: "the stylesheets", tests: ["ships the whole set"] },
  { name: "locales", tests: ["keeps every pack out of a component's bundle", "ships the packs without a client directive"] },
];
const BUNDLE_TITLES = BUNDLE_GROUPS.flatMap((group) => group.tests.map((title) => `${group.name} ${title}`));

const facts: Facts = {
  version: "2.3.4",
  license: "ISC",
  react: ">=18",
  testFiles: 7,
  tests: 41,
  integrationSuites: [
    { component: "data-table", library: "chakra" },
    { component: "data-table", library: "mui" },
  ],
  bundle: [
    { entry: "slotsmith", minBytes: 90_000, gzipBytes: 28_000 },
    { entry: "slotsmith/data-table", minBytes: 60_049, gzipBytes: 18_841 },
  ],
  coverage: [
    { component: "data-table", lines: 99.27, branches: 91.37, functions: 99.01, statements: 97.39 },
    { component: "file-uploader", lines: 89.28, branches: 79.36, functions: 89.47, statements: 86.53 },
    { component: "shared", lines: 100, branches: 84.4, functions: 92.31, statements: 92.59 },
    { component: "total", lines: 97.21, branches: 87.48, functions: 97.61, statements: 95.37 },
  ],
  suites: [
    { file: "src/__tests__/bundle.test.ts", component: "package", library: null, kind: "bundle", tests: BUNDLE_TITLES, groups: BUNDLE_GROUPS },
    { file: "src/data-table/__tests__/integrations/chakra.test.tsx", component: "data-table", library: "chakra", kind: "integration", tests: ["Chakra UI v3 renders rows", "Chakra UI v3 sorts <a column>"] },
    { file: "src/data-table/__tests__/integrations/mui.test.tsx", component: "data-table", library: "mui", kind: "integration", tests: ["MUI v7 renders rows"] },
    { file: "src/date-picker/__tests__/integrations/mui.test.tsx", component: "date-picker", library: "mui", kind: "integration", tests: ["MUI v7 picks a day", "MUI v7 picks a range"] },
    { file: "src/data-table/__tests__/integrations/later.test.tsx", component: "data-table", library: "later", kind: "integration", tests: ["a library added later"] },
    { file: "src/data-table/__tests__/sorting.test.tsx", component: "data-table", library: null, kind: "unit", tests: ["sorts"] },
  ],
  css: [{ entry: "slotsmith/styles.css", minBytes: 27_489, gzipBytes: 5_151 }],
};

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const parse = (html: string): Document => new JSDOM(html).window.document as Document;
const text = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
const render = async (component: Parameters<AstroContainer["renderToString"]>[0], props: Record<string, unknown> = {}) =>
  parse(await container.renderToString(component, { props: { lang: "en", facts, ...props } }));

describe("TestsSummary", () => {
  it("states the tests, the files and the version, then the coverage table", async () => {
    const doc = await render(TestsSummary);
    expect(text(doc.querySelector(".trust-summary"))).toContain("41 tests in 7 test files");
    expect(text(doc.querySelector(".trust-summary"))).toContain("2.3.4");
    expect(doc.querySelector("table")).not.toBeNull();
  });
});

describe("CoverageTable", () => {
  it("gives every source directory its own row, components first, then shared code, then the total", async () => {
    const doc = await render(CoverageTable);
    const bodies = [...doc.querySelectorAll("tbody")].map((body) => [...body.querySelectorAll("tr")].map((row) => [...row.children].map(text).join(" ")));
    // One body per group; every figure has two decimals.
    expect(bodies).toEqual([
      ["Components", "src/data-table/ 99.27% 91.37% 99.01% 97.39%", "src/file-uploader/ 89.28% 79.36% 89.47% 86.53%"],
      ["Shared code", "src/shared/ 100.00% 84.40% 92.31% 92.59%"],
      ["All of src/ 97.21% 87.48% 97.61% 95.37%"],
    ]);
    expect([...doc.querySelectorAll('th[scope="rowgroup"]')].map(text)).toEqual(["Components", "Shared code"]);
    expect(doc.querySelector('th[scope="colgroup"]')).toBeNull();
  });
});

describe("SuitesList", () => {
  it("groups the integration suites under their libraries, each suite opening to its test titles", async () => {
    const doc = await render(SuitesList, { kind: "integration" });
    const groups = [...doc.querySelectorAll("[data-library]")];
    // The site's library order first, then a library it does not know yet.
    expect(groups.map((group) => group.getAttribute("data-library"))).toEqual(["mui", "chakra", "later"]);
    expect(groups.map((group) => text(group.querySelector("h3")))).toEqual(["MUI", "Chakra UI", "later"]);
    const mui = groups[0]!;
    const suites = [...mui.querySelectorAll("details")];
    expect(suites.map((suite) => text(suite.querySelector("summary")))).toEqual(["Data table 1 test", "Date picker 2 tests"]);
    expect([...suites[1]!.querySelectorAll("li")].map((item) => text(item))).toEqual(["MUI v7 picks a day", "MUI v7 picks a range"]);
    expect(text(groups[1]!.querySelector("li:last-child"))).toBe("Chakra UI v3 sorts <a column>");
    expect(doc.querySelector("details[open]")).toBeNull();
    expect(text(doc.querySelector(".trust-summary"))).toBe("4 integration suites with 6 tests, for 3 libraries.");
  });

  it("counts one suite, one test and one library in the singular", async () => {
    const one = { ...facts, suites: facts.suites.filter((suite) => suite.file.endsWith("integrations/mui.test.tsx") && suite.component === "data-table") };
    const doc = await render(SuitesList, { kind: "integration", facts: one });
    expect(text(doc.querySelector(".trust-summary"))).toBe("1 integration suite with 1 test, for 1 library.");
  });

  it("lists what the bundle test proves, its titles under their describe blocks", async () => {
    const doc = await render(SuitesList, { kind: "bundle" });
    expect([...doc.querySelectorAll(".trust-titles__group")].map(text)).toEqual(["what an app bundles", "the stylesheets", "locales"]);
    expect([...doc.querySelectorAll("ul")].map((list) => [...list.querySelectorAll("li")].map(text))).toEqual([
      ["drops everything but DataTable", "keeps what the app imports"],
      ["ships the whole set"],
      ["keeps every pack out of a component's bundle", "ships the packs without a client directive"],
    ]);
    expect(text(doc.querySelector(".trust-summary"))).toBe("5 tests in src/__tests__/bundle.test.ts");
    expect(doc.querySelector("[data-library]")).toBeNull();
  });
});

describe("groupTitles", () => {
  it("uses the describe blocks the report recorded, a one-test block included", () => {
    expect(groupTitles({ tests: BUNDLE_TITLES, groups: BUNDLE_GROUPS }).map((group) => [group.prefix, group.titles.length])).toEqual([
      ["what an app bundles", 2],
      ["the stylesheets", 1],
      ["locales", 2],
    ]);
  });

  it("keeps the full titles in one unnamed group when no blocks were recorded", () => {
    expect(groupTitles({ tests: ["the stylesheets ships the whole set", "the stylesheets ships one"] })).toEqual([
      { prefix: "", titles: ["the stylesheets ships the whole set", "the stylesheets ships one"] },
    ]);
    expect(groupTitles({ tests: [] })).toEqual([]);
  });
});

describe("SizesTable", () => {
  it("shows KB with one decimal for every JavaScript entry and stylesheet", async () => {
    const doc = await render(SizesTable);
    const rows = [...doc.querySelectorAll("tbody tr")].map((row) => [...row.children].map(text).join(" "));
    expect(rows).toEqual([
      "slotsmith 90.0 KB 28.0 KB",
      "slotsmith/data-table 60.0 KB 18.8 KB",
      "slotsmith/styles.css 27.5 KB 5.2 KB",
    ]);
  });

  it("names each table's region apart from its first column", async () => {
    const doc = await render(SizesTable);
    expect([...doc.querySelectorAll('[role="region"]')].map((region) => region.getAttribute("aria-label"))).toEqual(["JavaScript sizes", "CSS sizes"]);
    expect([...doc.querySelectorAll("thead th:first-child")].map(text)).toEqual(["JavaScript entry", "Stylesheet"]);
  });

  it("says what was measured next to the numbers", async () => {
    const doc = await render(SizesTable);
    const notes = [...doc.querySelectorAll(".ref-note")].map((note) => text(note));
    expect(notes[0]).toMatch(/minified/i);
    expect(notes[0]).toMatch(/gzip/i);
    expect(notes[0]).toMatch(/React/);
    expect(notes[0]).toMatch(/peer/);
  });
});

describe("A11yResults", () => {
  it("carries the start and end markers once each, around the text a build without results shows", async () => {
    const html = await container.renderToString(A11yResults, { props: { lang: "en" } });
    expect(html.split(A11Y_MARKER)).toHaveLength(2);
    expect(html.split(A11Y_END_MARKER)).toHaveLength(2);
    const between = html.slice(html.indexOf(A11Y_MARKER) + A11Y_MARKER.length, html.indexOf(A11Y_END_MARKER));
    expect(between).toContain("trust-a11y__pending");
    expect(between).toContain("/actions/workflows/docs.yml");
  });
});

describe("Requirements", () => {
  it("reads the React range, the license and the version from the facts, and Node from the slotsmith-ai package", async () => {
    const ai = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../../packages/ai/package.json"), "utf8")) as { engines: { node: string } };
    const doc = await render(Requirements);
    const values = [...doc.querySelectorAll("tbody tr")].map((row) => text(row.querySelector("td")));
    expect(values).toEqual([">=18", ai.engines.node, "ISC", "2.3.4", "2.3.x"]);
  });
});

describe("trustMarkdown", () => {
  const url = "https://slotsmith.dev/trust/";
  const block = (name: string, attrs: Record<string, string> = {}, children?: string) => trustMarkdown({ name, attrs, children }, "en", url, facts);

  it("states the tests and the coverage of every directory", () => {
    const markdown = block("TestsSummary")!;
    expect(markdown).toContain("41 tests in 7 test files pass on version 2.3.4.");
    expect(markdown).toContain("| Directory | Lines | Branches | Functions | Statements |");
    expect(markdown).toContain("| `src/file-uploader/` | 89.28% | 79.36% | 89.47% | 86.53% |");
    expect(markdown).toContain("| `src/shared/` | 100.00% | 84.40% | 92.31% | 92.59% |");
    expect(markdown).toContain("| All of src/ | 97.21% | 87.48% | 97.61% | 95.37% |");
  });

  it("lists the integration suites per library with their titles", () => {
    const markdown = block("SuitesList", { kind: "integration" })!;
    expect(markdown.startsWith("4 integration suites with 6 tests, for 3 libraries.")).toBe(true);
    expect(markdown).toContain("### MUI\n\n- Data table, 1 test\n  - MUI v7 renders rows\n- Date picker, 2 tests\n  - MUI v7 picks a day");
    expect(markdown.indexOf("### MUI")).toBeLessThan(markdown.indexOf("### Chakra UI"));
    expect(markdown).toContain("### later");
  });

  it("lists the bundle test's titles in the page's groups", () => {
    expect(block("SuitesList", { kind: "bundle" })).toBe(
      [
        "5 tests in `src/__tests__/bundle.test.ts`",
        "- what an app bundles\n  - drops everything but DataTable\n  - keeps what the app imports",
        "- the stylesheets\n  - ships the whole set",
        "- locales\n  - keeps every pack out of a component's bundle\n  - ships the packs without a client directive",
      ].join("\n\n"),
    );
  });

  it("gives the sizes in the same unit as the page, with the measurement notes", () => {
    const markdown = block("SizesTable")!;
    expect(markdown).toContain("| `slotsmith/data-table` | 60.0 KB | 18.8 KB |");
    expect(markdown).toContain("| `slotsmith/styles.css` | 27.5 KB | 5.2 KB |");
    expect(markdown).toMatch(/peer dependencies are excluded/);
  });

  it("gives the requirements, points at the page for the axe table, and keeps a repository link", () => {
    expect(block("Requirements")).toContain("| Release line that gets security fixes | `2.3.x` |");
    expect(block("A11yResults")).toContain(`${url}#accessibility`);
    expect(block("RepoLink", { path: "/security/advisories/new" }, "a security advisory")).toBe(`[a security advisory](${SITE.repo}/security/advisories/new)`);
  });

  it("leaves other blocks to the caller", () => {
    expect(block("Note")).toBeUndefined();
  });
});
