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
import { A11Y_END_MARKER, A11Y_MARKER } from "../../../../scripts/lib/a11y-report.ts";

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
    { component: "shared", lines: 93.62, branches: 84.44, functions: 92.31, statements: 92.59 },
    { component: "total", lines: 97.21, branches: 87.48, functions: 97.61, statements: 95.37 },
  ],
  suites: [
    { file: "src/__tests__/bundle.test.ts", component: "package", library: null, kind: "bundle", tests: ["drops everything but DataTable from a main-entry import"] },
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
    const rows = [...doc.querySelectorAll("tbody tr")].map((row) => [...row.children].map(text).join(" "));
    expect(rows).toEqual([
      "Components",
      "src/data-table/ 99.27% 91.37% 99.01% 97.39%",
      "src/file-uploader/ 89.28% 79.36% 89.47% 86.53%",
      "Shared code",
      "src/shared/ 93.62% 84.44% 92.31% 92.59%",
      "All of src/ 97.21% 87.48% 97.61% 95.37%",
    ]);
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

  it("lists what the bundle test proves, from its titles", async () => {
    const doc = await render(SuitesList, { kind: "bundle" });
    expect([...doc.querySelectorAll("li")].map((item) => text(item))).toEqual(["drops everything but DataTable from a main-entry import"]);
    expect(text(doc.querySelector(".trust-summary"))).toContain("src/__tests__/bundle.test.ts");
    expect(doc.querySelector("[data-library]")).toBeNull();
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
