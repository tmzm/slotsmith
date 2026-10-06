import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildFacts, type Facts } from "../facts.ts";
import { manifestLine } from "../../src/lib/facts.ts";

const rootPackage = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf8")) as { version: string };

describe("buildFacts", () => {
  it("reads the package, the integration suites and the bundle sizes", async () => {
    const facts = await buildFacts({ skipTests: true });
    expect(facts.version).toBe(rootPackage.version);
    expect(facts.integrationSuites).toContainEqual({ component: "data-table", library: "mui" });
    expect(facts.bundle).toHaveLength(5);
    for (const entry of facts.bundle) {
      expect(entry.gzipBytes, entry.entry).toBeGreaterThan(0);
      expect(entry.gzipBytes, entry.entry).toBeLessThan(entry.minBytes);
    }
  }, 60_000);

  it("measures styles.css and each component's stylesheet", async () => {
    const facts = await buildFacts({ skipTests: true });
    expect(facts.css.map((entry) => entry.entry)).toEqual([
      "slotsmith/styles.css",
      "slotsmith/autocomplete.css",
      "slotsmith/data-table.css",
      "slotsmith/date-picker.css",
      "slotsmith/file-uploader.css",
    ]);
    for (const entry of facts.css) {
      expect(entry.gzipBytes, entry.entry).toBeGreaterThan(0);
      expect(entry.gzipBytes, entry.entry).toBeLessThan(entry.minBytes);
    }
  }, 60_000);
});

describe("buildFacts from a test report", () => {
  const fixtures = resolve(import.meta.dirname, "fixtures");
  const passing = { testsJson: resolve(fixtures, "tests-pass.json"), coverageJson: resolve(fixtures, "coverage-summary.json") };

  it("rejects with the failing tests when the run did not pass", async () => {
    const run = buildFacts({ testsJson: resolve(fixtures, "tests-fail.json"), coverageJson: passing.coverageJson });
    await expect(run).rejects.toThrow(/1 of 2 tests failed/);
    await expect(run).rejects.toThrow(/sorting keeps the sort after new data/);
    await expect(run).rejects.toThrow(/expected 'Bea' to be 'Ada'/);
  }, 60_000);

  it("counts the tests and files of the report", async () => {
    const facts = await buildFacts(passing);
    expect(facts.tests).toBe(6);
    expect(facts.testFiles).toBe(5);
  }, 60_000);

  it("classifies each test file and keeps the full test titles", async () => {
    const { suites } = await buildFacts(passing);
    expect(suites.map((suite) => suite.file)).toEqual([
      "src/__tests__/bundle.test.ts",
      "src/autocomplete/__tests__/a11y.test.tsx",
      "src/data-table/__tests__/integrations/mui.test.tsx",
      "src/data-table/__tests__/page-size.test.tsx",
      "src/data-table/core/__tests__/reorder.test.ts",
    ]);
    expect(suites).toContainEqual({
      file: "src/data-table/__tests__/integrations/mui.test.tsx",
      component: "data-table",
      library: "mui",
      kind: "integration",
      tests: ["DataTable with MUI parts renders MUI rows", "DataTable with MUI parts sorts from an MUI header"],
    });
    expect(suites.find((suite) => suite.file === "src/__tests__/bundle.test.ts")).toMatchObject({ component: "package", library: null, kind: "bundle" });
    expect(suites.find((suite) => suite.file.endsWith("a11y.test.tsx"))).toMatchObject({ component: "autocomplete", library: null, kind: "a11y" });
    expect(suites.find((suite) => suite.file.endsWith("reorder.test.ts"))).toMatchObject({ component: "data-table", library: null, kind: "unit" });
  }, 60_000);

  it("counts a suite that imports axe as an accessibility suite, whatever its name", async () => {
    // The report names the library's own page-size suite, which runs axe among its other checks.
    const { suites } = await buildFacts(passing);
    expect(suites.find((suite) => suite.file.endsWith("page-size.test.tsx"))).toMatchObject({ component: "data-table", library: null, kind: "a11y" });
  }, 60_000);

  it("rolls coverage up per component, then the total", async () => {
    const { coverage } = await buildFacts(passing);
    expect(coverage.map((row) => row.component)).toEqual(["autocomplete", "data-table", "date-picker", "file-uploader", "total"]);
    expect(coverage.find((row) => row.component === "data-table")).toEqual({ component: "data-table", lines: 75, branches: 60, functions: 87.5, statements: 79.17 });
    expect(coverage.at(-1)).toEqual({ component: "total", lines: 90, branches: 80, functions: 95, statements: 85 });
  }, 60_000);
});

const fixture: Facts = {
  version: "1.7.0",
  license: "ISC",
  react: ">=18",
  testFiles: 63,
  tests: 1311,
  integrationSuites: [
    { component: "data-table", library: "mui" },
    { component: "data-table", library: "shadcn" },
  ],
  bundle: [
    { entry: "slotsmith", minBytes: 90_000, gzipBytes: 28_000 },
    { entry: "slotsmith/data-table", minBytes: 60_000, gzipBytes: 18_841 },
  ],
  coverage: [],
  suites: [],
  css: [],
};

describe("manifestLine", () => {
  it("lists tests, suites, gzip, license and react, each linking to the trust page", () => {
    const line = manifestLine(fixture);
    expect(line.map((pair) => pair.key)).toEqual(["tests", "suites", "gzip", "license", "react"]);
    for (const pair of line) expect(pair.href).toMatch(/^\/trust\/#[a-z-]+$/);
  });

  it("formats the values like a package.json excerpt", () => {
    const values = Object.fromEntries(manifestLine(fixture).map((pair) => [pair.key, pair.value]));
    expect(values.tests).toBe("1311");
    expect(values.suites).toBe("2");
    expect(values.gzip).toMatch(/^"\d+\.\d KB"$/);
    expect(values.gzip).toBe('"18.4 KB"');
    expect(values.license).toBe('"ISC"');
    expect(values.react).toBe('">=18"');
  });
});
