/**
 * Trust page data
 *
 * Shapes the measured facts for the Trust page: coverage rows in groups,
 * integration suites per library, what the bundle test asserts, sizes and
 * the package requirements. The page's components and its Markdown copy both
 * read from here, so they state the same numbers.
 */
import { COMPONENTS } from "@/data/components";
import type { MessageKey } from "@/i18n";
import { ADAPTER_LIBRARIES } from "@/lib/adapters";
import type { Facts } from "@/lib/facts";

type CoverageRow = Facts["coverage"][number];
type Suite = Facts["suites"][number];

/** The coverage figures of a row, in column order. */
export const COVERAGE_COLUMNS = ["lines", "branches", "functions", "statements"] as const;

/**
 * Coverage rows in page order: the four components, then every other source
 * directory (shared code), then the total. No row is left out, so a low
 * figure in one directory is never folded into the total.
 */
export function coverageGroups(facts: Facts): { components: CoverageRow[]; shared: CoverageRow[]; total: CoverageRow | undefined } {
  const slugs: string[] = COMPONENTS.map((meta) => meta.slug);
  const rows = facts.coverage.filter((row) => row.component !== "total");
  return {
    components: rows.filter((row) => slugs.includes(row.component)),
    shared: rows.filter((row) => !slugs.includes(row.component)),
    total: facts.coverage.find((row) => row.component === "total"),
  };
}

/** A percentage as the page shows it (`91.37%`). */
export const percent = (value: number) => `${value}%`;

/** The message key of a component's name, when the directory is one of the four components. */
export function componentTitle(directory: string): MessageKey | undefined {
  return COMPONENTS.find((meta) => meta.slug === directory)?.title;
}

/** One UI library's integration suites. */
export interface LibrarySuites {
  /** The library's id, from the suite's file name (`mui`). */
  library: string;
  /** Its display name, or the id for a library the site does not list yet. */
  name: string;
  /** Its suites, in component order. */
  suites: Suite[];
}

/**
 * The integration suites grouped by library: the site's library order first,
 * then any other library by id, so a suite added to the library's tests shows
 * up with no change here.
 */
export function suitesByLibrary(facts: Facts): LibrarySuites[] {
  const suites = facts.suites.filter((suite) => suite.kind === "integration");
  const known: string[] = ADAPTER_LIBRARIES.map((library) => library.id);
  const rank = (id: string) => (known.includes(id) ? known.indexOf(id) : known.length);
  const ids = [...new Set(suites.map((suite) => suite.library ?? "other"))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return ids.map((library) => ({
    library,
    name: ADAPTER_LIBRARIES.find((entry) => entry.id === library)?.name ?? library,
    suites: suites.filter((suite) => (suite.library ?? "other") === library),
  }));
}

/** The tree-shaking test files (`src/__tests__/bundle.test.ts`). */
export function bundleSuites(facts: Facts): Suite[] {
  return facts.suites.filter((suite) => suite.kind === "bundle");
}

/** How many tests a list of suites holds. */
export const testCount = (suites: Suite[]) => suites.reduce((sum, suite) => sum + suite.tests.length, 0);

const packages = import.meta.glob<{ engines?: { node?: string } }>("../../../packages/ai/package.json", { eager: true, import: "default" });

/** A requirement row's id. */
export type RequirementKey = "react" | "node" | "license" | "version" | "supported";

/**
 * The requirement rows: React's peer range, the Node range `slotsmith-ai`
 * declares, the license, the version, and the release line that gets
 * security fixes (the latest minor, `1.7.x`).
 *
 * @throws When `packages/ai/package.json` declares no `engines.node`.
 */
export function requirements(facts: Facts): { key: RequirementKey; value: string }[] {
  const node = Object.values(packages)[0]?.engines?.node;
  if (!node) throw new Error("packages/ai/package.json declares no engines.node.");
  return [
    { key: "react", value: facts.react },
    { key: "node", value: node },
    { key: "license", value: facts.license },
    { key: "version", value: facts.version },
    { key: "supported", value: `${facts.version.split(".").slice(0, 2).join(".")}.x` },
  ];
}
