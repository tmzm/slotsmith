/**
 * Builds the search index
 *
 * Runs Pagefind over the built site and writes the bundle the search dialog
 * loads into `<site>/pagefind/`: the script, its worker and WebAssembly, and
 * one index per page language. Only `index.html` pages are read (the Google
 * verification file is not a page), and only what carries
 * `data-pagefind-body`. Pagefind also writes its own ready-made search
 * interfaces; the site has its own dialog, so they are deleted.
 *
 * Usage: `node scripts/search-index.ts [site]`; `site` defaults to `dist`.
 */
import { readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

/** Pagefind's own interfaces and its result-page highlighter. */
const UNUSED = /^pagefind-(ui|modular-ui|component-ui|highlight)\b/;

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(docsRoot, process.argv[2] ?? "dist");
const bundle = resolve(site, "pagefind");

const fail = (step: string, errors: string[]): never => {
  throw new Error(`search-index: ${step} failed: ${errors.join("; ")}`);
};

try {
  const { index, errors } = await pagefind.createIndex();
  if (!index) fail("creating the index", errors);
  const added = await index!.addDirectory({ path: site, glob: "**/index.html" });
  if (added.errors.length) fail("reading the site", added.errors);
  if (!added.page_count) fail("reading the site", [`no index.html under ${site}`]);
  const written = await index!.writeFiles({ outputPath: bundle });
  if (written.errors.length) fail("writing the bundle", written.errors);
  const removed = readdirSync(bundle).filter((name) => UNUSED.test(name));
  for (const name of removed) rmSync(resolve(bundle, name));
  console.log(`search-index: ${added.page_count} pages read, those with data-pagefind-body indexed into ${bundle}; removed ${removed.length} unused Pagefind interface files`);
} finally {
  await pagefind.close();
}
