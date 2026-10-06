/**
 * Accessibility results on the Trust page
 *
 * axe runs in `verify-site`, after `astro build`, so its results cannot be
 * rendered by Astro. The Trust page carries `A11Y_MARKER` instead, and the
 * verifier replaces it in the built `dist/trust/index.html` and
 * `dist/ar/trust/index.html` with the table `renderA11yTable` writes. No
 * second build.
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

/** The comment the Trust page holds where the table goes. */
export const A11Y_MARKER = "<!--a11y-results-->";

const STANDARD = "WCAG 2.2 AA";

interface Labels {
  summary: (demos: number, violations: number, version: string) => string;
  known: (count: number) => string;
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
    known: (count) => `${count} known library ${count === 1 ? "issue" : "issues"}, listed below the table. They fail in the parts as they ship; each needs a library fix.`,
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
      `العروض الاحتياطية: ${demos}، المخالفات: ${violations}، <bdi>axe-core ${version}</bdi>، <bdi>${STANDARD}</bdi>`,
    known: (count) => `مشكلات معروفة في المكتبة: ${count}، مذكورة تحت الجدول. تظهر في الأجزاء كما تُشحن، وكل منها يحتاج إلى إصلاح في المكتبة.`,
    sample: "العرض",
    page: "الصفحة",
    passes: "القواعد الناجحة",
    violations: "المخالفات",
    knownColumn: "مشكلات معروفة في المكتبة",
    none: "لا شيء",
    region: "نتائج axe لكل عرض احتياطي",
  },
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const code = (text: string) => `<code>${escapeHtml(text)}</code>`;

/**
 * Writes the axe results as a summary line and a table, one row per demo.
 *
 * @param results - One result per fallback demo, in page order.
 * @param lang - The Trust page's language; labels follow it, sample names and rule ids stay as they are.
 * @param axeVersion - The axe-core version that ran (`result.testEngine.version`).
 * @returns HTML to put in place of `A11Y_MARKER`.
 */
export function renderA11yTable(results: A11yResult[], lang: Lang, axeVersion: string): string {
  const labels = LABELS[lang];
  const violations = results.reduce((sum, result) => sum + result.violations.length, 0);
  const known = results.flatMap((result) => result.knownLibraryIssues ?? []);
  const list = (items: string[]) => (items.length ? items.join(", ") : labels.none);

  const rows = results.map((result) => {
    const found = result.violations.map((v) => `${code(v.id)} (${escapeHtml(v.impact)}, ${v.nodes})`);
    const issues = [...new Set((result.knownLibraryIssues ?? []).map((issue) => issue.rule))].map(code);
    return [
      "<tr>",
      `<td>${code(result.sample)}</td>`,
      `<td><a href="${escapeHtml(result.page)}">${escapeHtml(result.page)}</a></td>`,
      `<td>${result.passes}</td>`,
      `<td>${list(found)}</td>`,
      `<td>${list(issues)}</td>`,
      "</tr>",
    ].join("");
  });

  // One line per distinct issue: the same rule on the same part repeats across demos.
  const reasons = new Map<string, KnownFinding>();
  for (const issue of known) reasons.set(`${issue.rule} ${issue.reason}`, issue);
  const footnote = known.length
    ? [
        `<p>${escapeHtml(labels.known(known.length))}</p>`,
        `<ul lang="en" dir="ltr">`,
        ...[...reasons.values()].map((issue) => `<li>${code(issue.rule)}: ${escapeHtml(issue.reason)}</li>`),
        "</ul>",
      ]
    : [];

  return [
    `<div class="a11y-results">`,
    `<p>${lang === "en" ? escapeHtml(labels.summary(results.length, violations, axeVersion)) : labels.summary(results.length, violations, escapeHtml(axeVersion))}</p>`,
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
 * Puts the table in place of the Trust page's marker.
 *
 * @param html - The built Trust page.
 * @param table - What `renderA11yTable` returned.
 * @returns The page with its first marker replaced.
 * @throws When the page has no `A11Y_MARKER`.
 */
export function injectA11y(html: string, table: string): string {
  const at = html.indexOf(A11Y_MARKER);
  if (at === -1) throw new Error(`The Trust page has no ${A11Y_MARKER} marker to replace with the axe results.`);
  return html.slice(0, at) + table + html.slice(at + A11Y_MARKER.length);
}
