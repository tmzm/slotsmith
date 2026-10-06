/**
 * Post-build verifier
 *
 * Checks `docs/dist` after `astro build`:
 * - every page's head (title, description, canonical, hreflang, a built og:image), internal links
 *   and `#id` targets, and that every sample is shown somewhere;
 * - every page's JSON-LD (it parses; `SoftwareSourceCode` on the landing,
 *   `BreadcrumbList` elsewhere; an `FAQPage` lists the visible FAQ's
 *   questions in order) and its Markdown copy (`<path>index.md`, linked from
 *   the head, starting with `# <title>`);
 * - in a browser: no console error or warning and no uncaught error on any
 *   page, axe (WCAG 2.2 AA) on every fallback demo (findings allowlisted in
 *   `lib/axe-allowlist.ts` are recorded as known library issues, not
 *   problems), and every `data-*` attribute a demo's slots carry is listed in
 *   that slot's reference;
 * - that an in-page anchor scrolls within the page instead of navigating.
 *
 * Writes `dist/a11y.json`, puts the axe table between the Trust pages'
 * markers (`lib/a11y-report.ts`; a second run on the same `dist` replaces
 * it), and exits 1 on any problem. Stub pages are counted, and fail the run
 * only with `DOCS_STRICT=1`.
 *
 * The browser is Playwright's Chromium. `DOCS_BROWSER_CHANNEL` picks an
 * installed channel instead (default `chrome`); set it to `chromium` or empty
 * to use the bundled build, as CI does. `DOCS_SKIP_VERIFY=1` skips the whole
 * run (Netlify's build image has no browser; CI verifies every change).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright";
import type { ComponentReference } from "../src/lib/reference.ts";
import { findDeadLinks, findGeoProblems, findMetaProblems, findOgProblems, findUnusedSamples, readPage, type PageFacts } from "./lib/html.ts";
import { serveDir } from "./lib/serve.ts";
import { APP_FOLDERS, filesUnder } from "./lib/walk.ts";
import { sortViolations } from "./lib/axe-allowlist.ts";
import { A11Y_END_MARKER, A11Y_MARKER, injectA11y, renderA11yTable, type A11yResult } from "./lib/a11y-report.ts";
import type { Lang } from "../src/i18n/index.ts";
import { SLOT_SELECTORS } from "./slot-selectors.ts";

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(docsRoot, "dist");
const samplesDir = resolve(docsRoot, "samples");
const referenceDir = resolve(docsRoot, "src/generated/reference");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SAMPLE_EXTENSIONS = /\.(tsx|ts|cjs|css|json|sh)$/;
/** Attributes the site, not the library, puts on a demo's elements. */
const SITE_ATTRIBUTE = /^data-(sample|fallback|view|verify|astro-.*)$/;
const HYDRATE_MS = 15_000;
/** The Trust page per language, which publishes the axe results. */
const TRUST_PAGES: Record<Lang, string> = { en: "/trust/", ar: "/ar/trust/" };

type SlotMap = Record<string, Record<string, string[]>>;

/**
 * Puts the axe table between each language's Trust page markers, in `dist`.
 * A Trust page that is still a stub may lack the markers (it is skipped); a
 * finished one, or any with `DOCS_STRICT=1`, must exist and carry both. A run
 * with no results or no axe version publishes nothing and is a problem.
 *
 * @returns The problems found.
 */
function injectTrustPages(results: A11yResult[], axeVersion: string, facts: PageFacts[]): string[] {
  const problems: string[] = [];
  if (results.length === 0) problems.push("axe ran on no fallback demo, so there are no results to publish");
  else if (!axeVersion) problems.push("axe did not report its version, so the results cannot be published");
  if (problems.length) return problems;
  const strict = process.env.DOCS_STRICT === "1";
  for (const [lang, path] of Object.entries(TRUST_PAGES) as [Lang, string][]) {
    const file = resolve(distDir, `.${path}index.html`);
    const draft = !strict && facts.find((page) => page.path === path)?.stub === true;
    const skip = (what: string) => {
      if (draft) console.log(`verify: ${path} is a stub: ${what}, axe results not published there`);
      else problems.push(`${path}: ${what}, so the axe results are not published there`);
    };
    if (!existsSync(file)) {
      skip("the page is missing");
      continue;
    }
    const html = readFileSync(file, "utf8");
    if (!html.includes(A11Y_MARKER) || !html.includes(A11Y_END_MARKER)) {
      skip(`no ${A11Y_MARKER}${A11Y_END_MARKER} markers`);
      continue;
    }
    try {
      writeFileSync(file, injectA11y(html, renderA11yTable(results, lang, axeVersion)));
      console.log(`verify: axe results published on ${path}`);
    } catch (error) {
      problems.push(`${path}: ${(error as Error).message}`);
    }
  }
  return problems;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const toUrlPath = (file: string) => `/${relative(distDir, file).split("\\").join("/")}`;

/** Every sample name: the path under `samples/` without extension, as `lib/samples.ts` names them. */
function sampleNames(): string[] {
  return filesUnder(samplesDir, APP_FOLDERS)
    .map((file) => relative(samplesDir, file).split("\\").join("/"))
    .filter((name) => SAMPLE_EXTENSIONS.test(name) && name !== "tsconfig.json" && !name.split("/").some((part) => ["__tests__", "node_modules", ".next", "dist"].includes(part)))
    .map((name) => name.replace(SAMPLE_EXTENSIONS, ""))
    .sort();
}

/** The samples each sample imports by a relative path (a `?url` style query ignored), keyed by name, so adapters, stylesheets and shared data count as shown with the sample that uses them. */
function sampleImports(): Record<string, string[]> {
  const imports: Record<string, string[]> = {};
  const names = new Set(sampleNames());
  for (const name of names) {
    const file = filesUnder(samplesDir, APP_FOLDERS).find((f) => relative(samplesDir, f).split("\\").join("/").replace(SAMPLE_EXTENSIONS, "") === name);
    if (!file || !/\.tsx?$/.test(file)) continue;
    const found: string[] = [];
    for (const match of readFileSync(file, "utf8").matchAll(/(?:from|import)\s+["'](\.\.?\/[^"']+)["']/g)) {
      const target = relative(samplesDir, resolve(dirname(file), match[1]!.replace(/\?.*$/, ""))).split("\\").join("/").replace(SAMPLE_EXTENSIONS, "");
      if (names.has(target)) found.push(target);
    }
    imports[name] = found;
  }
  return imports;
}

function referenceAttributes(): SlotMap {
  const map: SlotMap = {};
  for (const slug of Object.keys(SLOT_SELECTORS)) {
    const reference = JSON.parse(readFileSync(resolve(referenceDir, `${slug}.json`), "utf8")) as ComponentReference;
    map[slug] = Object.fromEntries(reference.slots.map((slot) => [slot.name, slot.dataAttributes]));
  }
  return map;
}

/** Scrolls each demo into view and waits for its islands to hydrate. */
async function hydrateDemos(page: Page): Promise<void> {
  for (const figure of await page.locator("figure[data-sample]").all()) {
    await figure.scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => document.querySelectorAll("figure[data-sample] astro-island[ssr]").length === 0, null, {
    timeout: HYDRATE_MS,
  });
  await page.waitForLoadState("networkidle");
}

/** The `data-*` names on each slot's elements inside one demo, per component. */
function slotAttributes(page: Page, index: number): Promise<SlotMap> {
  return page.evaluate(
    ({ index, selectors, pattern }) => {
      const figure = document.querySelectorAll("figure[data-sample]")[index]!;
      const site = new RegExp(pattern);
      const found: Record<string, Record<string, string[]>> = {};
      for (const [slug, slots] of Object.entries(selectors)) {
        for (const [slot, selector] of Object.entries(slots)) {
          const names = new Set<string>();
          for (const element of figure.querySelectorAll(selector)) {
            for (const name of element.getAttributeNames()) {
              if (name.startsWith("data-") && !site.test(name)) names.add(name);
            }
          }
          if (names.size) (found[slug] ??= {})[slot] = [...names].sort();
        }
      }
      return found;
    },
    { index, selectors: SLOT_SELECTORS, pattern: SITE_ATTRIBUTE.source },
  );
}

/** Checks that an in-page anchor moves to its target and keeps the page's URL. */
async function checkAnchor(page: Page, origin: string, facts: PageFacts[]): Promise<string[]> {
  const inPage = (p: PageFacts) => p.links.filter((link) => link.startsWith(`${p.path}#`));
  const withToc = facts.find((p) => inPage(p).some((link) => !link.endsWith("#content")));
  const chosen = withToc ?? facts.find((p) => inPage(p).length > 0);
  if (!chosen) return ["anchor: no page has an in-page link to check"];
  const link = inPage(chosen).find((l) => !l.endsWith("#content")) ?? inPage(chosen)[0]!;
  const hash = link.slice(link.indexOf("#"));

  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(origin + chosen.path, { waitUntil: "load" });
  // Links hold the percent-encoded hash; ids and the HTML's hrefs hold the raw text (Arabic slugs).
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return [`anchor: ${hash} on ${chosen.path} has a malformed escape`];
  }
  const shown = `#${id}`;
  const before = await page.evaluate(
    ({ id, path }) => {
      const decode = (text: string) => {
        try {
          return decodeURIComponent(text);
        } catch {
          return text;
        }
      };
      // Make the page taller than the viewport so a scroll is observable, then start at the bottom.
      const spacer = document.createElement("div");
      spacer.style.blockSize = "300vh";
      document.body.append(spacer);
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      // Any link to this page's anchor counts, written as `#id` or as `/path/#id`.
      const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a[href*='#']")].filter(
        (a) => decode(a.pathname) === decode(path) && decode(a.hash) === `#${id}`,
      );
      const anchor = anchors.find((a) => a.getClientRects().length > 0) ?? anchors[0];
      if (!anchor) return null;
      const y = window.scrollY;
      anchor.click();
      return y;
    },
    { id, path: chosen.path },
  );
  if (before === null) return [`anchor: no link to ${shown} on ${chosen.path}`];
  try {
    // Smooth scrolling is on: wait until the target is in view.
    await page.waitForFunction(
      (id) => {
        const top = document.getElementById(id)?.getBoundingClientRect().top ?? -1;
        return top >= 0 && top < window.innerHeight;
      },
      id,
      { timeout: 5000 },
    );
  } catch {
    // Reported below with the numbers.
  }
  const result = await page.evaluate((id) => {
    const decode = (text: string) => {
      try {
        return decodeURIComponent(text);
      } catch {
        return text;
      }
    };
    return {
      after: window.scrollY,
      top: document.getElementById(id)?.getBoundingClientRect().top ?? Number.NaN,
      height: window.innerHeight,
      path: decode(location.pathname),
      hash: decode(location.hash),
    };
  }, id);
  const problems: string[] = [];
  if (result.path !== chosen.path || result.hash !== shown) {
    problems.push(`anchor: ${shown} on ${chosen.path} navigated to ${result.path}${result.hash}`);
  } else if (!(result.after < before && result.top >= 0 && result.top < result.height)) {
    problems.push(
      `anchor: ${shown} on ${chosen.path} did not scroll its target into view (scrollY ${Math.round(before)} -> ${Math.round(result.after)}, target top ${Math.round(result.top)} of ${result.height})`,
    );
  } else {
    console.log(`verify: ${shown} on ${chosen.path} scrolled from ${Math.round(before)} to ${Math.round(result.after)}`);
  }
  return problems;
}

async function main(): Promise<void> {
  if (process.env.DOCS_SKIP_VERIFY === "1") {
    console.log("verify: skipped (DOCS_SKIP_VERIFY=1)");
    return;
  }
  const files = walk(distDir).map(toUrlPath);
  const pageFiles = files.filter((file) => file.endsWith("/index.html")).sort();
  const geoProblems: string[] = [];
  const facts = pageFiles.map((file) => {
    const path = file.slice(0, -"index.html".length);
    const html = readFileSync(resolve(distDir, `.${file}`), "utf8");
    const markdownFile = resolve(distDir, `.${path}index.md`);
    geoProblems.push(...findGeoProblems(path, html, existsSync(markdownFile) ? readFileSync(markdownFile, "utf8") : null));
    return readPage(path, html);
  });

  const problems = [
    ...findMetaProblems(facts),
    ...findOgProblems(facts, new Set(files)),
    ...findDeadLinks(facts, new Set(files)),
    // The framework examples are whole apps that CI builds; a page shows only the files that matter.
    ...findUnusedSamples(facts, sampleNames().filter((name) => !name.startsWith("frameworks/")), sampleImports()).map((name) => `sample "${name}" is not shown on any page`),
    ...geoProblems,
  ];

  const reference = referenceAttributes();
  const missing: SlotMap = {};
  const a11y: A11yResult[] = [];
  let axeVersion = "";
  let knownIssues = 0;

  const server = await serveDir(distDir, 0);
  const channel = process.env.DOCS_BROWSER_CHANNEL ?? "chrome";
  const browser = await chromium.launch(channel && channel !== "chromium" ? { channel } : {});
  try {
    const context = await browser.newContext();
    // Every page loads Google Tag Manager. Answer it with an empty script so the
    // run needs no network (a failed request is a console error) and tracking
    // code never runs against the local server.
    await context.route(/^https:\/\/www\.googletagmanager\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "/* Tag Manager, stubbed by the verifier */" }),
    );
    for (const { path } of facts) {
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
          problems.push(`console ${message.type()} on ${path}: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => problems.push(`uncaught error on ${path}: ${error.message}`));
      await page.goto(server.url + path, { waitUntil: "load" });

      const demos = await page.locator("figure[data-sample]").count();
      if (demos > 0) {
        try {
          await hydrateDemos(page);
        } catch (error) {
          problems.push(`demos on ${path} did not hydrate: ${(error as Error).message.split("\n")[0]}`);
        }
      }
      for (let index = 0; index < demos; index++) {
        const figure = page.locator("figure[data-sample]").nth(index);
        const sample = (await figure.getAttribute("data-sample")) ?? "";
        if ((await figure.getAttribute("data-fallback")) !== null) {
          await figure.evaluate((element) => element.setAttribute("data-verify", "axe"));
          const result = await new AxeBuilder({ page }).include('[data-verify="axe"]').withTags(AXE_TAGS).analyze();
          await figure.evaluate((element) => element.removeAttribute("data-verify"));
          const { known, problems: found } = sortViolations(result.violations);
          axeVersion = result.testEngine.version;
          a11y.push({
            page: path,
            sample,
            violations: found.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.targets.length })),
            passes: result.passes.length,
            knownLibraryIssues: known,
          });
          for (const violation of found) {
            problems.push(`axe ${violation.id} (${violation.impact}) in ${sample} on ${path}: ${violation.help} [${violation.targets.join("; ")}]`);
          }
          knownIssues += known.length;
        }
        for (const [slug, slots] of Object.entries(await slotAttributes(page, index))) {
          for (const [slot, names] of Object.entries(slots)) {
            const known = reference[slug]?.[slot] ?? [];
            const extra = names.filter((name) => !known.includes(name));
            if (!extra.length) continue;
            const list = ((missing[slug] ??= {})[slot] ??= []);
            for (const name of extra) if (!list.includes(name)) list.push(name);
          }
        }
      }
      await page.close();
    }
    problems.push(...(await checkAnchor(await context.newPage(), server.url, facts)));
  } finally {
    await browser.close();
    await server.close();
  }

  if (Object.keys(missing).length) {
    for (const [slug, slots] of Object.entries(missing)) {
      for (const [slot, names] of Object.entries(slots)) {
        problems.push(`${slug} ${slot} carries ${names.join(", ")}, missing from its reference`);
        names.sort();
      }
    }
    console.error(`Add to docs/src/data/data-attributes.json:\n${JSON.stringify(missing, null, 2)}`);
  }

  writeFileSync(resolve(distDir, "a11y.json"), `${JSON.stringify(a11y, null, 2)}\n`);
  problems.push(...injectTrustPages(a11y, axeVersion, facts));

  const stubs = facts.filter((page) => page.stub).length;
  if (process.env.DOCS_STRICT === "1" && stubs > 0) {
    problems.push(...facts.filter((page) => page.stub).map((page) => `stub page ${page.path}`));
  }
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.log(`verify: ${facts.length} pages, ${problems.length} problems, ${stubs} stubs, ${knownIssues} known library a11y issues`);
  if (problems.length) process.exitCode = 1;
}

await main();
