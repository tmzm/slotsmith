/**
 * SEO files
 *
 * The text of `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt`.
 * Pure: the endpoints under `src/pages/` pass in the pages and write out what
 * these return. Every absolute URL comes from `SITE.url`.
 */
import { SITE } from "../../site.config.ts";
import { LANGS, t, type Lang } from "@/i18n";
import { alternates, canonicalUrl } from "@/lib/page";
import type { PageKind } from "@/lib/pages";

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

/**
 * The sitemap: one `<url>` per path per language, each with its `en`, `ar`
 * and `x-default` alternates, as the pages' own `hreflang` links list them.
 *
 * @param pages - Language-neutral paths; a path listed for several languages is written once per language all the same.
 */
export function renderSitemap(pages: { path: string; lang: Lang; lastmod?: string | null }[]): string {
  const byPath = new Map<string, string | null | undefined>();
  for (const page of pages) {
    const known = byPath.get(page.path);
    // The newest date any language of the page has.
    if (!byPath.has(page.path) || (page.lastmod && (!known || page.lastmod > known))) byPath.set(page.path, page.lastmod);
  }
  const urls = [...byPath.entries()].flatMap(([path, lastmod]) =>
    LANGS.map((lang) =>
      [
        "  <url>",
        `    <loc>${escapeXml(canonicalUrl(lang, path))}</loc>`,
        ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
        ...alternates(path).map((link) => `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${escapeXml(link.href)}"/>`),
        "  </url>",
      ].join("\n"),
    ),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** `robots.txt`: everything is allowed, and the sitemap is named. */
export function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
}

/** The `llms.txt` sections, in order, and the page kinds each lists. */
const LLMS_SECTIONS: { title: string; kinds: PageKind[] }[] = [
  { title: "Docs", kinds: ["doc"] },
  { title: "Components", kinds: ["component"] },
  { title: "Guides", kinds: ["guide"] },
  { title: "API reference", kinds: ["api"] },
  { title: "Adapters", kinds: ["adapters"] },
];

/** The heading and positioning quote both llms files open with. */
function llmsHeader(): string {
  return `# ${t("en", "site.name")}\n\n> ${t("en", "site.positioning")}\n`;
}

/**
 * `llms.txt` (llmstxt.org): the name, the positioning as a quote, then a
 * link list per kind of page. English pages only; the Arabic pages are
 * translations of the same content.
 *
 * @param pages - The pages to list, in reading order.
 * @param href - The URL each link points at. Defaults to the page's canonical URL.
 */
export function renderLlms(
  pages: { path: string; lang: Lang; title: string; description: string; kind: PageKind }[],
  href: (page: { path: string; lang: Lang }) => string = (page) => canonicalUrl(page.lang, page.path),
): string {
  const english = pages.filter((page) => page.lang === "en");
  const sections = LLMS_SECTIONS.map(({ title, kinds }) => {
    const listed = english.filter((page) => kinds.includes(page.kind));
    if (listed.length === 0) return "";
    return `## ${title}\n\n${listed.map((page) => `- [${page.title}](${href(page)}): ${page.description}`).join("\n")}\n`;
  }).filter(Boolean);
  const optional = `## Optional\n\n- [Full text](${SITE.url}/llms-full.txt): every page above and each component's generated reference in one Markdown file\n`;
  return [llmsHeader(), ...sections, optional].join("\n");
}

/**
 * `llms-full.txt`: the llms header and a contents list, then every section's
 * Markdown in order, each preceded by the URL it was taken from.
 */
export function renderLlmsFull(sections: { title: string; url: string; markdown: string }[]): string {
  const contents = `## Contents\n\n${sections.map((section) => `- [${section.title}](${section.url})`).join("\n")}\n`;
  const body = sections.map((section) => `Source: ${section.url}\n\n${section.markdown.trim()}\n`);
  return [`${llmsHeader()}\n${contents}`, ...body].join("\n---\n\n");
}
