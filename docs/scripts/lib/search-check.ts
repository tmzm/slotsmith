/**
 * The verifier's search check: drives the real search dialog on the served
 * build, once per language.
 *
 * Each case loads a page, checks nothing under `/pagefind/` was fetched with
 * it, opens the dialog with `/`, types a query, and reads the results. The
 * English case must list an expected page in its first five results and no
 * `/ar/` page; the Arabic case must list `/ar/` pages only. Each also runs axe
 * on the open dialog and closes it with Escape. Console errors and uncaught
 * errors on the way are problems.
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
  expected?: string;
  /** Whether results must be `/ar/` pages (true) or must not be (false). */
  arabic: boolean;
}

const CASES: SearchCase[] = [
  { path: "/getting-started/", query: "reorder", expected: "/components/data-table/guides/row-reorder/", arabic: false },
  // No expected page: the Arabic index does not stem the English prose these pages still show, so its ranking differs.
  { path: "/ar/getting-started/", query: "reorder", arabic: true },
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
    return ["search: dist/pagefind/pagefind.js is missing; run `pagefind --site dist` after `astro build`"];
  }
  const problems: string[] = [];
  for (const { path, query, expected, arabic } of CASES) {
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
      await page.locator("dialog.search [role=option]").first().waitFor({ timeout: WAIT_MS });
      const found = await page.locator("dialog.search [role=option]").evaluateAll((options) => options.map((option) => new URL((option as HTMLAnchorElement).href).pathname));
      const first = found.slice(0, FIRST);
      if (expected && !first.includes(expected)) problems.push(`search: "${query}" on ${path} does not list ${expected} in its first ${FIRST} results (${first.join(", ")})`);
      const wrong = found.filter((url) => url.startsWith("/ar/") !== arabic);
      if (wrong.length) problems.push(`search: "${query}" on ${path} lists ${arabic ? "pages outside /ar/" : "/ar/ pages"} (${wrong.join(", ")})`);

      const result = await new AxeBuilder({ page }).include("dialog.search").withTags(axeTags).analyze();
      for (const violation of result.violations) {
        problems.push(`search: axe ${violation.id} (${violation.impact}) in the dialog on ${path}: ${violation.help} [${violation.nodes.map((node) => node.target.join(" ")).join("; ")}]`);
      }

      await page.keyboard.press("Escape");
      await page.locator("dialog.search:not([open])").waitFor({ state: "attached", timeout: WAIT_MS });
      console.log(`verify: search "${query}" on ${path} listed ${found.length} results, first ${first[0]}`);
    } catch (error) {
      problems.push(`search: the dialog on ${path} did not work: ${(error as Error).message.split("\n")[0]}`);
    }
    await page.close();
  }
  return problems;
}
