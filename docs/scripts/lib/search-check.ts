/**
 * The verifier's search check: drives the real search dialog on the served
 * build, once per language.
 *
 * Each case loads a page, checks nothing under `/pagefind/` was fetched with
 * it, opens the dialog with `/`, types a query, and reads the results once the
 * dialog says they answer that query. The English case must list an expected
 * page in its first five results and no `/ar/` page. The Arabic case searches
 * for a prop name, which stays the same when the prose is translated, and
 * must list `/ar/` pages only, a data-table page among them. Each also runs
 * axe on the open dialog and closes it with Escape. Console errors and
 * uncaught errors on the way are problems.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { BrowserContext } from "playwright";

interface SearchCase {
  /** The page searched from. */
  path: string;
  query: string;
  /** A path the first results must include. */
  first?: string;
  /** A path prefix some result must have. */
  some?: string;
  /** Whether results must be `/ar/` pages (true) or must not be (false). */
  arabic: boolean;
}

const CASES: SearchCase[] = [
  { path: "/getting-started/", query: "reorder", first: "/components/data-table/guides/row-reorder/", arabic: false },
  // No fixed page: the Arabic index ranks differently, and will again as pages are translated.
  { path: "/ar/getting-started/", query: "onReorder", some: "/ar/components/data-table/", arabic: true },
];

const FIRST = 5;
const WAIT_MS = 15_000;

/**
 * @param context - The verifier's browser context.
 * @param origin - The served site's origin.
 * @param distDir - The built site, to tell a missing index from a broken dialog.
 * @param axeTags - The axe rule tags the verifier uses.
 * @returns The problems found.
 */
export async function checkSearch(context: BrowserContext, origin: string, distDir: string, axeTags: string[]): Promise<string[]> {
  if (!existsSync(resolve(distDir, "pagefind/pagefind.js"))) {
    return ["search: dist/pagefind/pagefind.js is missing; run `node scripts/search-index.ts` after `astro build`"];
  }
  const problems: string[] = [];
  for (const { path, query, first, some, arabic } of CASES) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    const early: string[] = [];
    let opened = false;
    page.on("request", (request) => {
      if (!opened && new URL(request.url()).pathname.startsWith("/pagefind/")) early.push(request.url());
    });
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") problems.push(`search: console ${message.type()} on ${path}: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`search: uncaught error on ${path}: ${error.message}`));
    try {
      await page.goto(origin + path, { waitUntil: "networkidle" });
      await page.locator("[data-search-trigger]").waitFor({ state: "visible", timeout: WAIT_MS });
      if (early.length) problems.push(`search: ${path} fetched Pagefind before search was opened (${early[0]})`);
      opened = true;
      await page.keyboard.press("/");
      await page.locator("dialog.search[open]").waitFor({ timeout: WAIT_MS });
      await page.keyboard.type(query);
      // The status names the query its results answer: earlier, partial queries do not count.
      await page.locator(`dialog.search [role=status][data-status=ready][data-query="${query}"]`).waitFor({ state: "attached", timeout: WAIT_MS });
      const found = await page.locator("dialog.search [role=option]").evaluateAll((options) => options.map((option) => new URL((option as HTMLAnchorElement).href).pathname));
      const top = found.slice(0, FIRST);
      if (found.length === 0) problems.push(`search: "${query}" on ${path} lists no results`);
      if (first && !top.includes(first)) problems.push(`search: "${query}" on ${path} does not list ${first} in its first ${FIRST} results (${top.join(", ")})`);
      if (some && !found.some((url) => url.startsWith(some))) problems.push(`search: "${query}" on ${path} lists no page under ${some} (${found.join(", ")})`);
      const wrong = found.filter((url) => url.startsWith("/ar/") !== arabic);
      if (wrong.length) problems.push(`search: "${query}" on ${path} lists ${arabic ? "pages outside /ar/" : "/ar/ pages"} (${wrong.join(", ")})`);

      const result = await new AxeBuilder({ page }).include("dialog.search").withTags(axeTags).analyze();
      for (const violation of result.violations) {
        problems.push(`search: axe ${violation.id} (${violation.impact}) in the dialog on ${path}: ${violation.help} [${violation.nodes.map((node) => node.target.join(" ")).join("; ")}]`);
      }

      await page.keyboard.press("Escape");
      await page.locator("dialog.search:not([open])").waitFor({ state: "attached", timeout: WAIT_MS });
      console.log(`verify: search "${query}" on ${path} listed ${found.length} results, first ${top[0]}`);
    } catch (error) {
      problems.push(`search: the dialog on ${path} did not work: ${(error as Error).message.split("\n")[0]}`);
    }
    await page.close();
  }
  return problems;
}
