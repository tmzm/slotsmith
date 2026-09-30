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

interface RootPackage {
  version: string;
  license: string;
  peerDependencies: { react: string };
  exports: Record<string, { import: { default: string } }>;
}

/** Test counts from the library's full suite (`vitest run` at the repo root). */
function countTests(): { tests: number; testFiles: number } {
  const dir = mkdtempSync(join(tmpdir(), "slotsmith-facts-"));
  const report = join(dir, "vitest.json");
  try {
    const run = spawnSync(process.execPath, [resolve(libraryRoot, "node_modules/vitest/vitest.mjs"), "run", "--reporter=json", `--outputFile=${report}`], {
      cwd: libraryRoot,
      stdio: ["ignore", "ignore", "inherit"],
    });
    if (run.status !== 0 || !existsSync(report)) throw new Error(`The library's tests failed (exit ${run.status}); the site states only numbers from a passing run.`);
    const result = JSON.parse(readFileSync(report, "utf8")) as { numTotalTests: number; testResults: unknown[] };
    return { tests: result.numTotalTests, testFiles: result.testResults.length };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The counts of the last run, for `FACTS_SKIP_TESTS=1` (dev only), or 0 when there was none. */
function previousCounts(): { tests: number; testFiles: number } {
  if (!existsSync(outFile)) return { tests: 0, testFiles: 0 };
  const previous = JSON.parse(readFileSync(outFile, "utf8")) as Partial<Facts>;
  return { tests: previous.tests ?? 0, testFiles: previous.testFiles ?? 0 };
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

/** Each entry from `dist/`, bundled alone and minified, then gzipped. */
async function bundleSizes(pkg: RootPackage): Promise<Facts["bundle"]> {
  const sizes: Facts["bundle"] = [];
  for (const entry of ENTRIES) {
    const key = entry === "slotsmith" ? "." : `./${entry.slice("slotsmith/".length)}`;
    const file = pkg.exports[key]?.import.default;
    if (!file) throw new Error(`The package has no export "${key}".`);
    const path = resolve(libraryRoot, file);
    if (!existsSync(path)) throw new Error(`${file} is missing. Build the library first: pnpm build`);
    const result = await build({
      entryPoints: [path],
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

/**
 * Measures the facts the site states about the library.
 *
 * @param opts.skipTests - Reuses the last counts instead of running the suite
 *   (about four minutes). Defaults to `FACTS_SKIP_TESTS=1`; CI never sets it.
 */
export async function buildFacts(opts: { skipTests?: boolean } = {}): Promise<Facts> {
  const skipTests = opts.skipTests ?? process.env.FACTS_SKIP_TESTS === "1";
  const pkg = JSON.parse(readFileSync(resolve(libraryRoot, "package.json"), "utf8")) as RootPackage;
  const counts = skipTests ? previousCounts() : countTests();
  return {
    version: pkg.version,
    license: pkg.license,
    react: pkg.peerDependencies.react,
    testFiles: counts.testFiles,
    tests: counts.tests,
    integrationSuites: integrationSuites(),
    bundle: await bundleSizes(pkg),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const facts = await buildFacts();
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(facts, null, 2)}\n`);
  const table = facts.bundle.find((entry) => entry.entry === "slotsmith/data-table");
  console.log(
    `facts: v${facts.version}, ${facts.tests} tests in ${facts.testFiles} files, ${facts.integrationSuites.length} integration suites, data-table ${table?.gzipBytes} B gzipped`,
  );
}
