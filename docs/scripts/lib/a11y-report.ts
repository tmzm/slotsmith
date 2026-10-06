/**
 * Accessibility results on the Trust page
 *
 * axe runs in `verify-site`, after `astro build`, so its results cannot be
 * rendered by Astro. The Trust page carries `A11Y_MARKER` followed by
 * `A11Y_END_MARKER` instead, and the verifier writes the table
 * `renderA11yTable` returns between them in the built
 * `dist/trust/index.html` and `dist/ar/trust/index.html`. Both markers stay,
 * so verifying the same `dist` again replaces the table. No second build.
 *
 * The labels live here, not in `src/i18n`: the verifier runs under Node's
 * type stripping and cannot load the catalogs.
 */
import type { Lang } from "../../src/i18n/index.ts";
import type { KnownFinding } from "./axe-allowlist.ts";

/** axe's result for one fallback demo. */
export interface A11yResult {
  /** The page the demo is on (`/components/data-table/`). */
  page: string;
  /** The sample's name (`data-table/basic`). */
  sample: string;
  /** Findings that fail the build: one entry per rule, with the number of elements it flagged. */
  violations: { id: string; impact: string; nodes: number }[];
  /** The number of axe rules that passed. */
  passes: number;
  /** Findings in the library's own parts, allowlisted in `axe-allowlist.ts`. */
  knownLibraryIssues?: KnownFinding[];
}

/** The comment that opens the place the table goes on the Trust page. */
export const A11Y_MARKER = "<!--a11y-results-->";
/** The comment that closes it. Whatever sits between the two is replaced. */
export const A11Y_END_MARKER = "<!--/a11y-results-->";

const STANDARD = "WCAG 2.2 AA";

interface Labels {
  summary: (demos: number, violations: number, version: string) => string;
  known: (issues: number, demos: number) => string;
  sample: string;
  page: string;
  passes: string;
  violations: string;
  knownColumn: string;
  none: string;
  region: string;
}

// Arabic avoids plural agreement by writing counts as "label: n".
const LABELS: Record<Lang, Labels> = {
  en: {
    summary: (demos, violations, version) =>
      `${demos} fallback ${demos === 1 ? "demo" : "demos"}, ${violations} ${violations === 1 ? "violation" : "violations"}, axe-core ${version}, ${STANDARD}`,
    known: (issues, demos) =>
      `${issues} known library ${issues === 1 ? "issue" : "issues"} on ${demos} ${demos === 1 ? "demo" : "demos"}, listed below the table. They fail in the parts as they ship; each needs a library fix.`,
    sample: "Sample",
    page: "Page",
    passes: "Rules passed",
    violations: "Violations",
    knownColumn: "Known library issues",
    none: "None",
    region: "axe results per fallback demo",
  },
  ar: {
    summary: (demos, violations, version) =>
      `عروض البدائل الافتراضية: ${demos}، المخالفات: ${violations}، <bdi>axe-core ${version}</bdi>، <bdi>${STANDARD}</bdi>`,
    known: (issues, demos) =>
      `مشكلات معروفة في المكتبة: ${issues}، في عروض عددها: ${demos}، مذكورة تحت الجدول. تظهر في الأجزاء كما تُشحن، وكل منها يحتاج إلى إصلاح في المكتبة.`,
    sample: "العرض",
    page: "الصفحة",
    passes: "القواعد الناجحة",
    violations: "المخالفات",
    knownColumn: "مشكلات معروفة في المكتبة",
    none: "لا يوجد",
    region: "نتائج axe لعروض البدائل الافتراضية",
  },
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const code = (text: string) => `<code>${escapeHtml(text)}</code>`;

/**
 * Writes the axe results: a summary line, the known library issues stated
 * right under it, a table with one row per demo, then each known issue's reason.
 *
 * @param results - One result per fallback demo, in page order.
 * @param lang - The Trust page's language; labels follow it, sample names and rule ids stay as they are.
 * @param axeVersion - The axe-core version that ran (`result.testEngine.version`).
 * @returns HTML to put between `A11Y_MARKER` and `A11Y_END_MARKER`.
 */
export function renderA11yTable(results: A11yResult[], lang: Lang, axeVersion: string): string {
  const labels = LABELS[lang];
  const violations = results.reduce((sum, result) => sum + result.violations.length, 0);
  const list = (items: string[]) => (items.length ? items.join(", ") : labels.none);

  const rows = results.map((result) => {
    const found = result.violations.map((v) => `<span lang="en" dir="ltr">${code(v.id)} (${escapeHtml(v.impact)}, ${v.nodes})</span>`);
    const issues = [...new Set((result.knownLibraryIssues ?? []).map((issue) => issue.rule))].map(code);
    return [
      "<tr>",
      // The Latin text is isolated inside the cell, so the cell still aligns with its header.
      `<td><bdi dir="ltr">${code(result.sample)}</bdi></td>`,
      `<td><a dir="ltr" href="${escapeHtml(result.page)}">${escapeHtml(result.page)}</a></td>`,
      `<td>${result.passes}</td>`,
      `<td>${list(found)}</td>`,
      `<td>${list(issues)}</td>`,
      "</tr>",
    ].join("");
  });

  // One issue per rule and reason: the same part fails the same rule in many demos, on many elements.
  const reasons = new Map<string, KnownFinding>();
  for (const result of results) for (const issue of result.knownLibraryIssues ?? []) reasons.set(`${issue.rule} ${issue.reason}`, issue);
  const affected = results.filter((result) => result.knownLibraryIssues?.length).length;
  const known = reasons.size ? [`<p>${escapeHtml(labels.known(reasons.size, affected))}</p>`] : [];
  const footnote = reasons.size
    ? [
        `<ul lang="en" dir="ltr">`,
        ...[...reasons.values()].map((issue) => `<li>${code(issue.rule)}: ${escapeHtml(issue.reason)}</li>`),
        "</ul>",
      ]
    : [];

  return [
    // The page around the table may be in another language (an untranslated Trust page on /ar/ is
    // English prose, left to right), so the block states its own; names and paths stay left to right.
    `<div class="a11y-results" lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`,
    `<p>${lang === "en" ? escapeHtml(labels.summary(results.length, violations, axeVersion)) : labels.summary(results.length, violations, escapeHtml(axeVersion))}</p>`,
    ...known,
    // The site's reference-table region (styles/reference.css): it scrolls inside itself, never the page.
    `<div class="ref-table" role="region" tabindex="0" aria-label="${labels.region}"><table>`,
    `<thead><tr><th scope="col">${labels.sample}</th><th scope="col">${labels.page}</th><th scope="col">${labels.passes}</th><th scope="col">${labels.violations}</th><th scope="col">${labels.knownColumn}</th></tr></thead>`,
    `<tbody>${rows.join("")}</tbody>`,
    `</table></div>`,
    ...footnote,
    `</div>`,
  ].join("\n");
}

/**
 * Puts the table between the Trust page's markers, replacing what is there:
 * nothing on the first run, the last run's table after that.
 *
 * @param html - The built Trust page.
 * @param table - What `renderA11yTable` returned.
 * @returns The page with the table between its first pair of markers, both kept.
 * @throws When the page has no `A11Y_MARKER`, or no `A11Y_END_MARKER` after it.
 */
export function injectA11y(html: string, table: string): string {
  const start = html.indexOf(A11Y_MARKER);
  if (start === -1) throw new Error(`The Trust page has no ${A11Y_MARKER} marker for the axe results.`);
  const from = start + A11Y_MARKER.length;
  const end = html.indexOf(A11Y_END_MARKER, from);
  if (end === -1) throw new Error(`The Trust page has no ${A11Y_END_MARKER} marker after ${A11Y_MARKER}.`);
  return html.slice(0, from) + table + html.slice(end);
}
