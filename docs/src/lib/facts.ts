/**
 * Facts
 *
 * The numbers the site states about the library: version, license, React
 * range, test counts, integration suites and bundle sizes. `scripts/facts.ts`
 * measures them into `src/generated/facts.json` on every build, so no page
 * types a number by hand.
 */

/** What `scripts/facts.ts` measures. */
export interface Facts {
  /** The library's version, from the root `package.json`. */
  version: string;
  /** Its license identifier. */
  license: string;
  /** The React range it supports (`peerDependencies.react`). */
  react: string;
  /** Test files in the library's suite. */
  testFiles: number;
  /** Tests in the library's suite. */
  tests: number;
  /** Each component's test suite against a UI library's parts. */
  integrationSuites: { component: string; library: string }[];
  /** Each package entry bundled alone, minified, with its peers external. */
  bundle: { entry: string; minBytes: number; gzipBytes: number }[];
}

const files = import.meta.glob<Facts>("../generated/facts.json", { eager: true, import: "default" });

/**
 * The measured facts.
 *
 * @throws When `src/generated/facts.json` has not been generated.
 */
export function getFacts(): Facts {
  const facts = Object.values(files)[0];
  if (!facts) throw new Error("No facts data. Build the library, then run the facts script: pnpm --filter slotsmith-docs facts");
  return facts;
}

/** Formats bytes as kilobytes with one decimal (`18.4 KB`). */
export function kilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * The trust manifest: the landing's one line, written like a `package.json`
 * excerpt. String values keep their quotes.
 *
 * @param facts - The measured facts.
 * @returns The pairs in order, each linking to its section of the Trust page.
 * @throws When the facts have no `slotsmith/data-table` bundle entry.
 */
export function manifestLine(facts: Facts): { key: string; value: string; href: string }[] {
  const table = facts.bundle.find((entry) => entry.entry === "slotsmith/data-table");
  if (!table) throw new Error('The facts have no "slotsmith/data-table" bundle entry.');
  const quote = (text: string) => JSON.stringify(text);
  return [
    { key: "tests", value: String(facts.tests), href: "/trust/#tests" },
    { key: "suites", value: String(facts.integrationSuites.length), href: "/trust/#integration-suites" },
    { key: "gzip", value: quote(kilobytes(table.gzipBytes)), href: "/trust/#bundle-size" },
    { key: "license", value: quote(facts.license), href: "/trust/#license" },
    { key: "react", value: quote(facts.react), href: "/trust/#react" },
  ];
}
