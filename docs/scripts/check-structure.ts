import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The `##` headings of a component overview, in the order the page template promises. */
export const OVERVIEW_HEADINGS = ["Overview", "Install", "Quick start", "Guides", "Reference", "Adapters", "Accessibility", "Limitations", "FAQ"] as const;

const OVERVIEW_FILE = /(?:^|\/)content\/docs\/[^/]+\/components\/[^/]+\/index\.mdx$/;
const GUIDE_FILE = /(?:^|\/)content\/docs\/[^/]+\/components\/[^/]+\/guides\/[^/]+\.mdx$/;
const QUICK_START_FILE = /(?:^|\/)samples\/[^/]+\/quick-start\.tsx$/;
/** An import of `../shared/` in any form: `from "…"` (an import or a re-export), a side-effect `import "…"`, or a dynamic `import("…")`. */
const SHARED_IMPORT = /\b(?:from|import)\s*\(?\s*["']\.\.\/shared\//;
const DOCS_MDX_FILE = /(?:^|\/)content\/docs\/.+\.mdx$/;

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
 *   `../shared/` in any form (static, side-effect, dynamic or re-export): one message, since quick starts are copied standalone.
 *   Anything else: none.
 */
export function findStructureProblems(file: string, text: string): string[] {
  const path = file.replaceAll("\\", "/");
  if (OVERVIEW_FILE.test(path)) return overviewProblems(text);
  if (GUIDE_FILE.test(path)) {
    return /<Demo\b/.test(text.replace(FENCED, "")) ? [] : ["a guide needs at least one live <Demo />"];
  }
  if (QUICK_START_FILE.test(path)) {
    return SHARED_IMPORT.test(text) ? ['a quick start must be standalone: inline its data instead of importing from "../shared/"'] : [];
  }
  return [];
}

/** The most words an opening paragraph may have. */
export const ANSWER_FIRST_MAX_WORDS = 50;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** A frontmatter field's value, unquoted. */
function frontmatterField(mdx: string, field: string): string | undefined {
  const yaml = FRONTMATTER.exec(mdx)?.[1] ?? "";
  const value = yaml
    .split(/\r?\n/)
    .find((line) => line.startsWith(`${field}:`))
    ?.slice(field.length + 1)
    .trim();
  if (value === undefined) return undefined;
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1).replace(/\\"/g, '"') : value;
}

/** True when the MDX frontmatter marks the page as a stub (`draft: true`). */
export function isDraft(mdx: string): boolean {
  return frontmatterField(mdx, "draft") === "true";
}

/** What kind of block a non-prose opening is, or null for a prose paragraph. */
function blockKind(block: string): string | null {
  if (/^#/.test(block)) return "a heading";
  if (/^</.test(block)) return "a component";
  if (/^([-*+]|\d+[.)])\s/.test(block)) return "a list";
  if (/^(`{3,}|~{3,})/.test(block)) return "code";
  if (/^>/.test(block)) return "a quote";
  return null;
}

/**
 * Answer-first problems in one docs MDX file: the first block after the
 * frontmatter, imports and comments must be a prose paragraph (not a
 * heading, component, list, quote or code) of at most 50 words that names
 * the page's subject: its `title`, case-insensitive, or for a guide the
 * component's name.
 *
 * @param file - The file's path (either slash direction); only `content/docs/**.mdx` is checked.
 * @param mdx - The file's text.
 * @returns One message per problem; none for other files.
 */
export function findAnswerFirstProblems(file: string, mdx: string): string[] {
  const path = file.replaceAll("\\", "/");
  if (!DOCS_MDX_FILE.test(path)) return [];
  const body = mdx
    .replace(FRONTMATTER, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^(?:import|export)\s[^\n]*$/gm, "")
    .trim();
  const first = body.split(/\r?\n[ \t]*\r?\n/)[0]?.trim() ?? "";
  if (!first) return ["the page has no opening paragraph: open with one that says what the page is about"];
  const kind = blockKind(first);
  if (kind) return [`the page opens with ${kind}: open with a prose paragraph that answers what the page is about`];

  const problems: string[] = [];
  const words = first.split(/\s+/).filter(Boolean).length;
  if (words > ANSWER_FIRST_MAX_WORDS) problems.push(`the opening paragraph has ${words} words; keep it to ${ANSWER_FIRST_MAX_WORDS}`);
  const subjects: string[] = [];
  const title = frontmatterField(mdx, "title");
  if (title) subjects.push(title);
  const component = GUIDE_FILE.test(path) ? /components\/([^/]+)\/guides\//.exec(path)?.[1] : undefined;
  if (component) subjects.push(component.replaceAll("-", " "));
  const text = first.toLowerCase();
  if (!subjects.some((subject) => text.includes(subject.toLowerCase()))) {
    problems.push(`the opening paragraph does not name the page's subject (${subjects.map((s) => `"${s}"`).join(" or ")})`);
  }
  return problems;
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
  // A stub (`draft: true`) is still being written: its opening is checked only in strict mode (DOCS_STRICT=1).
  const strict = process.env.DOCS_STRICT === "1";
  const failures = files.flatMap((file) => {
    const text = readFileSync(resolve(docsRoot, file), "utf8");
    const answerFirst = strict || !isDraft(text) ? findAnswerFirstProblems(file, text) : [];
    return [...findStructureProblems(file, text), ...answerFirst].map((problem) => `${file}: ${problem}`);
  });
  if (failures.length > 0) {
    console.error(`check-structure: ${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`check-structure: ${files.length} files, structure OK.`);
}
