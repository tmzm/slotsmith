import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Fenced languages whose blocks must be copied from a sample. */
const CHECKED = new Set(["tsx", "ts", "jsx", "css"]);

/**
 * A fenced block: indentation, fence, language, then the body up to a closing
 * fence of the same kind. The body group is optional and tried empty first, so
 * an empty block closes on the next line instead of running on to a later one.
 */
const FENCE = /^([ \t]*)(`{3,}|~{3,})[ \t]*([\w-]*)[^\n]*\n(?:([\s\S]*?)\n)??[ \t]*\2[ \t]*$/gm;

/** Collapses every run of whitespace, so indentation and line breaks do not matter. */
const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Code blocks in an MDX file that no sample backs. A checked block indented
 * inside JSX (a tab, a note) is reported whatever its text: MDX keeps the
 * indentation in the code, so such blocks belong in `<SampleCode>`.
 *
 * @param mdx - The MDX text.
 * @param samples - The text of every sample file.
 * @returns The body of each fenced `tsx`, `ts`, `jsx` or `css` block whose
 *   whitespace-normalised text is not part of any sample, in order; for an
 *   indented block, a message that says to use `<SampleCode>` instead.
 */
export function findUnbackedSnippets(mdx: string, samples: string[]): string[] {
  const haystacks = samples.map(normalise);
  const unbacked: string[] = [];
  for (const [, indent = "", fence = "", lang = "", body = ""] of mdx.matchAll(FENCE)) {
    if (!CHECKED.has(lang)) continue;
    if (indent) {
      const first = body.trim().split("\n", 1)[0];
      unbacked.push(`indented ${fence}${lang} block inside JSX, use <SampleCode name="…" /> instead: ${first}`);
      continue;
    }
    const needle = normalise(body);
    if (!haystacks.some((haystack) => haystack.includes(needle))) unbacked.push(body);
  }
  return unbacked;
}

/** Every file under a folder, recursively. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const samples = filesUnder(resolve(docsRoot, "samples"))
    .filter((file) => !file.endsWith("tsconfig.json"))
    .map((file) => readFileSync(file, "utf8"));
  const pages = filesUnder(resolve(docsRoot, "src/content")).filter((file) => file.endsWith(".mdx"));
  const failures = pages.flatMap((file) =>
    findUnbackedSnippets(readFileSync(file, "utf8"), samples).map(
      (body) => `${relative(docsRoot, file).replaceAll("\\", "/")}: ${body.split("\n", 1)[0]}`,
    ),
  );
  if (failures.length > 0) {
    console.error(`check-snippets: ${failures.length} code block(s) not taken from a sample in docs/samples/:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`check-snippets: ${pages.length} MDX files, every code block comes from a sample.`);
}
