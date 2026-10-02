import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The `##` headings of a component overview, in the order the page template promises. */
export const OVERVIEW_HEADINGS = ["Overview", "Install", "Quick start", "Guides", "Reference", "Adapters", "Accessibility", "Limitations"] as const;

const OVERVIEW_FILE = /(?:^|\/)content\/docs\/[^/]+\/components\/[^/]+\/index\.mdx$/;
const GUIDE_FILE = /(?:^|\/)content\/docs\/[^/]+\/components\/[^/]+\/guides\/[^/]+\.mdx$/;
const QUICK_START_FILE = /(?:^|\/)samples\/[^/]+\/quick-start\.tsx$/;

/** Fenced code blocks, so a `##` or `<Demo` inside an example is not read as page structure. */
const FENCED = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm;

/** The text of every `## ` heading outside code fences, in order. */
function h2s(mdx: string): string[] {
  return [...mdx.replace(FENCED, "").matchAll(/^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)].map(([, text = ""]) => text);
}

function overviewProblems(mdx: string): string[] {
  const found = h2s(mdx);
  const expected: readonly string[] = OVERVIEW_HEADINGS;
  const problems = expected.filter((h) => !found.includes(h)).map((h) => `missing the "## ${h}" heading`);
  const extra = found.filter((h) => !expected.includes(h));
  if (extra.length > 0) problems.push(`unexpected heading(s) ${extra.map((h) => `"## ${h}"`).join(", ")}; an overview has only ${expected.join(", ")}`);
  const present = found.filter((h) => expected.includes(h));
  const order = expected.filter((h) => present.includes(h));
  if (problems.length === 0 && present.join("\n") !== order.join("\n")) {
    problems.push(`headings out of order: found ${present.join(", ")}; expected ${order.join(", ")}`);
  }
  return problems;
}

/**
 * Structure problems in one docs file, by the kind its path names.
 *
 * @param file - The file's path (either slash direction); it decides which rules apply.
 * @param text - The file's text.
 * @returns A component overview MDX (`components/<slug>/index.mdx`) whose
 *   `##` headings differ from `OVERVIEW_HEADINGS`: one message per missing
 *   heading, one for unknown headings and one for a wrong order. A guide MDX
 *   (`components/<slug>/guides/*.mdx`) without a `<Demo`: one message. A
 *   quick-start sample (`samples/<slug>/quick-start.tsx`) importing from
 *   `../shared/`: one message, since quick starts are copied standalone.
 *   Anything else: none.
 */
export function findStructureProblems(file: string, text: string): string[] {
  const path = file.replaceAll("\\", "/");
  if (OVERVIEW_FILE.test(path)) return overviewProblems(text);
  if (GUIDE_FILE.test(path)) {
    return /<Demo\b/.test(text.replace(FENCED, "")) ? [] : ["a guide needs at least one live <Demo />"];
  }
  if (QUICK_START_FILE.test(path)) {
    return /from\s+["']\.\.\/shared\//.test(text) ? ['a quick start must be standalone: inline its data instead of importing from "../shared/"'] : [];
  }
  return [];
}

/** Every file under a folder, recursively. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const files = [...filesUnder(resolve(docsRoot, "src/content")), ...filesUnder(resolve(docsRoot, "samples"))].map((file) =>
    relative(docsRoot, file).replaceAll("\\", "/"),
  );
  const failures = files.flatMap((file) =>
    findStructureProblems(file, readFileSync(resolve(docsRoot, file), "utf8")).map((problem) => `${file}: ${problem}`),
  );
  if (failures.length > 0) {
    console.error(`check-structure: ${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`check-structure: ${files.length} files, structure OK.`);
}
