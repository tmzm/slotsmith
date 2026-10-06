import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import type { Facts } from "../src/lib/facts.ts";

export type { Facts };

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libraryRoot = resolve(docsRoot, "..");
const outFile = resolve(docsRoot, "src/generated/facts.json");

/** The package entries whose size the site states, in the order it lists them. */
const ENTRIES = ["slotsmith", "slotsmith/data-table", "slotsmith/autocomplete", "slotsmith/date-picker", "slotsmith/file-uploader"];

/** What an app brings itself, so it is left out of each entry's size. */
const EXTERNAL = ["react", "react-dom", "react/*", "react-dom/*", "@tanstack/*", "@floating-ui/*"];

/** The coverage metrics the site states, as the json-summary report names them. */
const METRICS = ["lines", "branches", "functions", "statements"] as const;

type Metric = (typeof METRICS)[number];

interface RootPackage {
  version: string;
  license: string;
  peerDependencies: { react: string };
  exports: Record<string, { import: { default: string } } | string>;
}

/** The parts of vitest's JSON report that the facts read. */
interface TestReport {
  numTotalTests: number;
  numFailedTests: number;
  success: boolean;
  testResults: {
    name: string;
    status: string;
    message?: string;
    assertionResults: { fullName: string; status: string; failureMessages: string[]; ancestorTitles?: string[]; title?: string }[];
  }[];
}

/** A json-summary coverage report: `total`, then one entry per file path. */
type CoverageSummary = Record<string, Record<Metric, { total: number; covered: number; pct: number }>>;

/** An import of axe or one of its test wrappers, static or dynamic. */
const AXE_IMPORT = /(?:from|import)\s*\(?\s*["'](?:axe-core|jest-axe|vitest-axe)["']/;

/** The facts that come from a test run. */
type TestFacts = Pick<Facts, "tests" | "testFiles" | "coverage" | "suites">;

/**
 * Runs the library's suite once (`vitest run` at the repo root), with
 * coverage of `src/` and test files left out of it.
 *
 * @returns The facts of the run.
 * @throws With vitest's output when the run fails, so a failing test fails
 *   the docs build instead of publishing a lower count; and when a passing
 *   run wrote no coverage summary, so the site never states tests without
 *   coverage.
 */
function runSuite(): TestFacts {
  const dir = mkdtempSync(join(tmpdir(), "slotsmith-facts-"));
  const testsJson = join(dir, "tests.json");
  const coverageDir = join(dir, "coverage");
  try {
    // The run takes minutes and prints nothing until it ends.
    console.log("facts: running the library suite…");
    const run = spawnSync(
      process.execPath,
      [
        resolve(libraryRoot, "node_modules/vitest/vitest.mjs"),
        "run",
        "--coverage",
        "--coverage.reporter=json-summary",
        "--coverage.include=src/**/*.{ts,tsx}",
        "--coverage.exclude=**/__tests__/**",
        `--coverage.reportsDirectory=${coverageDir}`,
        // Coverage slows each file down, and the build machine has few cores.
        // The longer limits only keep a slow test from timing out: a failed
        // assertion fails at once, whatever the limit.
        "--testTimeout=60000",
        "--hookTimeout=60000",
        "--reporter=default",
        "--reporter=json",
        `--outputFile.json=${testsJson}`,
      ],
      { cwd: libraryRoot, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    );
    if (run.status !== 0 || !existsSync(testsJson)) {
      const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim() || run.error?.message || "";
      throw new Error(`The library's tests failed (exit ${run.status}); the site states only numbers from a passing run.\n\n${output}`);
    }
    const coverageJson = join(coverageDir, "coverage-summary.json");
    if (!existsSync(coverageJson)) {
      throw new Error("The library's tests passed but wrote no coverage summary (coverage-summary.json); the site states coverage only from a measured run.");
    }
    return testFacts(testsJson, coverageJson);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Reads the facts from a vitest JSON report and a json-summary coverage report.
 *
 * @param testsJson - The JSON report's path.
 * @param coverageJson - The coverage summary's path; without one, the facts
 *   have no coverage rows. Only a report passed in by a test may lack it: the
 *   real run (`runSuite`) throws first.
 * @throws With each failing file and test and its failure messages when the
 *   report is not of a passing run.
 */
function testFacts(testsJson: string, coverageJson?: string): TestFacts {
  const report = JSON.parse(readFileSync(testsJson, "utf8")) as TestReport;
  if (!report.success || report.numFailedTests > 0) throw new Error(failureText(report));
  const coverage = coverageJson && existsSync(coverageJson) ? coverageOf(JSON.parse(readFileSync(coverageJson, "utf8")) as CoverageSummary) : [];
  return { tests: report.numTotalTests, testFiles: report.testResults.length, suites: suitesOf(report), coverage };
}

/** Lists each failing file and test of a report with its failure messages. */
function failureText(report: TestReport): string {
  const indent = (text: string) => text.replace(/^/gm, "    ");
  const lines: string[] = [];
  for (const result of report.testResults) {
    if (result.status !== "failed") continue;
    const file = relativePath(result.name);
    if (result.message) lines.push(`FAIL ${file}`, indent(result.message));
    for (const test of result.assertionResults) {
      if (test.status === "failed") lines.push(`FAIL ${file} > ${test.fullName}`, ...test.failureMessages.map(indent));
    }
  }
  const summary = report.numFailedTests > 0 ? `${report.numFailedTests} of ${report.numTotalTests} tests failed` : "The test run failed";
  return `${summary}; the site states only numbers from a passing run.\n\n${lines.join("\n")}`;
}

/** A path from a report, relative to the repo root with forward slashes (`src/data-table/DataTable.tsx`). */
function relativePath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const root = `${libraryRoot.replaceAll("\\", "/")}/`;
  if (normalized.toLowerCase().startsWith(root.toLowerCase())) return normalized.slice(root.length);
  const src = normalized.indexOf("/src/");
  return src === -1 ? normalized : normalized.slice(src + 1);
}

/** True when a test file of the library imports axe: it checks accessibility whatever its name. */
function importsAxe(file: string): boolean {
  const path = resolve(libraryRoot, file);
  return existsSync(path) && AXE_IMPORT.test(readFileSync(path, "utf8"));
}

/**
 * Each test file of a report in path order, classified, with its tests' full
 * titles. A file is an accessibility suite by its name (`a11y.test.tsx`,
 * `*axe*`) or by importing axe, so a suite that runs axe among other checks
 * (the data table's page-size and reorder suites) counts as one.
 */
function suitesOf(report: TestReport): Facts["suites"] {
  return report.testResults
    .map((result) => {
      const file = relativePath(result.name);
      const segments = file.split("/");
      const name = segments.at(-1) ?? file;
      const component = segments[1] === undefined || segments[1] === "__tests__" ? "package" : segments[1];
      const integration = /\/__tests__\/integrations\/([^/.]+)[^/]*$/.exec(file);
      let kind: Facts["suites"][number]["kind"] = "unit";
      if (integration) kind = "integration";
      else if (file === "src/__tests__/bundle.test.ts") kind = "bundle";
      else if (name === "a11y.test.tsx" || name.includes("axe") || importsAxe(file)) kind = "a11y";
      const tests = result.assertionResults.map((test) => test.fullName);
      // Only the page's list of what the tree-shaking test asserts shows the titles under their `describe` blocks.
      return kind === "bundle"
        ? { file, component, library: null, kind, tests, groups: describeGroups(result.assertionResults) }
        : { file, component, library: integration?.[1] ?? null, kind, tests };
    })
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
}

/**
 * A file's tests under their `describe` blocks, in report order: each run of
 * consecutive tests with the same ancestors is one group, named by those
 * ancestors (nested blocks joined with a space; empty for a test outside any
 * block), with each test's own title.
 */
function describeGroups(tests: TestReport["testResults"][number]["assertionResults"]): NonNullable<Facts["suites"][number]["groups"]> {
  const groups: NonNullable<Facts["suites"][number]["groups"]> = [];
  for (const test of tests) {
    const name = (test.ancestorTitles ?? []).join(" ");
    const last = groups.at(-1);
    const title = test.title ?? test.fullName;
    if (last && last.name === name) last.tests.push(title);
    else groups.push({ name, tests: [title] });
  }
  return groups;
}

/** A percentage with two decimals, as the coverage report rounds it; 100 when there is nothing to cover. */
function percent(covered: number, total: number): number {
  return total === 0 ? 100 : Math.round((covered / total) * 10_000) / 100;
}

/** Coverage summed per `src/<component>/` directory in name order, then the report's total. */
function coverageOf(summary: CoverageSummary): Facts["coverage"] {
  const groups = new Map<string, Record<Metric, { total: number; covered: number }>>();
  for (const [path, metrics] of Object.entries(summary)) {
    if (path === "total") continue;
    const segments = relativePath(path).split("/");
    if (segments[0] !== "src" || segments.length < 3 || segments.includes("__tests__")) continue;
    const component = segments[1]!;
    const group = groups.get(component) ?? Object.fromEntries(METRICS.map((metric) => [metric, { total: 0, covered: 0 }]));
    for (const metric of METRICS) {
      group[metric].total += metrics[metric].total;
      group[metric].covered += metrics[metric].covered;
    }
    groups.set(component, group as Record<Metric, { total: number; covered: number }>);
  }
  const rows: Facts["coverage"] = [...groups.keys()].sort().map((component) => {
    const group = groups.get(component)!;
    return {
      component,
      lines: percent(group.lines.covered, group.lines.total),
      branches: percent(group.branches.covered, group.branches.total),
      functions: percent(group.functions.covered, group.functions.total),
      statements: percent(group.statements.covered, group.statements.total),
    };
  });
  const total = summary.total;
  if (!total) throw new Error("The coverage summary has no total.");
  rows.push({ component: "total", lines: total.lines.pct, branches: total.branches.pct, functions: total.functions.pct, statements: total.statements.pct });
  return rows;
}

/** The test facts of the last run, for `FACTS_SKIP_TESTS=1` (dev only), or empty when there was none. */
function previousTestFacts(): TestFacts {
  const previous = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, "utf8")) as Partial<Facts>) : {};
  return { tests: previous.tests ?? 0, testFiles: previous.testFiles ?? 0, coverage: previous.coverage ?? [], suites: previous.suites ?? [] };
}

/** Every `src/<component>/__tests__/integrations/<library>.test.tsx`. */
function integrationSuites(): Facts["integrationSuites"] {
  const suites: Facts["integrationSuites"] = [];
  const src = resolve(libraryRoot, "src");
  for (const component of readdirSync(src, { withFileTypes: true })) {
    if (!component.isDirectory()) continue;
    const dir = resolve(src, component.name, "__tests__/integrations");
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      const match = /^(.+)\.test\.tsx$/.exec(file);
      if (match) suites.push({ component: component.name, library: match[1]! });
    }
  }
  return suites;
}

/**
 * The `dist/` file a package export points at.
 *
 * @throws When the package has no such export or the library is not built.
 */
function exportedFile(pkg: RootPackage, key: string): string {
  const target = pkg.exports[key];
  const file = typeof target === "string" ? target : target?.import.default;
  if (!file) throw new Error(`The package has no export "${key}".`);
  const path = resolve(libraryRoot, file);
  if (!existsSync(path)) throw new Error(`${file} is missing. Build the library first: pnpm build`);
  return path;
}

/** Each entry from `dist/`, bundled alone and minified, then gzipped. */
async function bundleSizes(pkg: RootPackage): Promise<Facts["bundle"]> {
  const sizes: Facts["bundle"] = [];
  for (const entry of ENTRIES) {
    const key = entry === "slotsmith" ? "." : `./${entry.slice("slotsmith/".length)}`;
    const result = await build({
      entryPoints: [exportedFile(pkg, key)],
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      write: false,
      outdir: "out",
      external: EXTERNAL,
      loader: { ".css": "empty" },
      logLevel: "silent",
    });
    const js = result.outputFiles.find((output) => output.path.endsWith(".js"));
    if (!js) throw new Error(`esbuild produced no JavaScript for ${entry}.`);
    sizes.push({ entry, minBytes: js.contents.byteLength, gzipBytes: gzipSync(js.contents, { level: 9 }).byteLength });
  }
  return sizes;
}

/** `styles.css`, then each component's stylesheet export, minified with esbuild's CSS loader, then gzipped. */
async function cssSizes(pkg: RootPackage): Promise<Facts["css"]> {
  const keys = Object.keys(pkg.exports).filter((key) => key.endsWith(".css") && !key.includes("*"));
  keys.sort((a, b) => (a === "./styles.css" ? -1 : b === "./styles.css" ? 1 : 0));
  const sizes: Facts["css"] = [];
  for (const key of keys) {
    const entry = `slotsmith/${key.slice(2)}`;
    const result = await build({
      entryPoints: [exportedFile(pkg, key)],
      bundle: true,
      minify: true,
      write: false,
      outdir: "out",
      loader: { ".css": "css" },
      logLevel: "silent",
    });
    const css = result.outputFiles.find((output) => output.path.endsWith(".css"));
    if (!css) throw new Error(`esbuild produced no CSS for ${entry}.`);
    sizes.push({ entry, minBytes: css.contents.byteLength, gzipBytes: gzipSync(css.contents, { level: 9 }).byteLength });
  }
  return sizes;
}

/**
 * Measures the facts the site states about the library.
 *
 * @param opts.skipTests - Reuses the last test facts instead of running the
 *   suite (about three minutes). Defaults to `FACTS_SKIP_TESTS=1`; CI never
 *   sets it.
 * @param opts.testsJson - Reads the test facts from this vitest JSON report
 *   instead of running the suite (for tests).
 * @param opts.coverageJson - The json-summary coverage report that goes with
 *   `testsJson`.
 * @throws When a test fails, with the failures, so no lower count is published.
 */
export async function buildFacts(opts: { skipTests?: boolean; testsJson?: string; coverageJson?: string } = {}): Promise<Facts> {
  const skipTests = opts.skipTests ?? process.env.FACTS_SKIP_TESTS === "1";
  const pkg = JSON.parse(readFileSync(resolve(libraryRoot, "package.json"), "utf8")) as RootPackage;
  const tests = opts.testsJson ? testFacts(opts.testsJson, opts.coverageJson) : skipTests ? previousTestFacts() : runSuite();
  return {
    version: pkg.version,
    license: pkg.license,
    react: pkg.peerDependencies.react,
    testFiles: tests.testFiles,
    tests: tests.tests,
    integrationSuites: integrationSuites(),
    bundle: await bundleSizes(pkg),
    coverage: tests.coverage,
    suites: tests.suites,
    css: await cssSizes(pkg),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const facts = await buildFacts();
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(facts, null, 2)}\n`);
    const table = facts.bundle.find((entry) => entry.entry === "slotsmith/data-table");
    const total = facts.coverage.find((row) => row.component === "total");
    console.log(
      `facts: v${facts.version}, ${facts.tests} tests in ${facts.testFiles} files, ${total?.lines ?? "no"}% lines covered, ${facts.integrationSuites.length} integration suites, data-table ${table?.gzipBytes} B gzipped`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
