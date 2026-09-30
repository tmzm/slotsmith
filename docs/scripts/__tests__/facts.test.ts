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
