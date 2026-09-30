/**
 * Built-page facts
 *
 * Reads what the verifier needs from one prerendered page and checks a set of
 * pages against each other. Pure: no file system, no browser. The HTML is
 * Astro's own output, so a tag-level scan is enough; script and style bodies
 * and comments are dropped first so text inside them is never read as markup.
 */
import { SITE } from "../../site.config.ts";

/** What one built page declares and links to. */
export interface PageFacts {
  /** The page's path with trailing slash (`/theming/`, `/ar/theming/`). */
  path: string;
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  /** The `hreflang` values of the page's alternate links. */
  alternates: string[];
  /** Internal `<a href>` targets as path plus optional hash, in document order. */
  links: string[];
  /** Every `id` in the page. */
  ids: string[];
  /** The `data-sample` names on the page. */
  samples: string[];
  /** True when `<main>` carries `data-stub`. */
  stub: boolean;
}

interface Tag {
  name: string;
  attrs: Map<string, string>;
}

const TAG = /<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodes the named and numeric character references Astro emits. */
function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

function tags(html: string): Tag[] {
  const found: Tag[] = [];
  for (const match of html.matchAll(TAG)) {
    const attrs = new Map<string, string>();
    for (const attr of (match[2] ?? "").matchAll(ATTR)) {
      attrs.set(attr[1]!.toLowerCase(), decode(attr[2] ?? attr[3] ?? attr[4] ?? ""));
    }
    found.push({ name: match[1]!.toLowerCase(), attrs });
  }
  return found;
}

/** Turns an href into `/path/#hash` when it points inside the site, else null. */
function internalTarget(href: string, pagePath: string): string | null {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed === "#") return null;
  if (/^(?:mailto|tel|javascript|data):/i.test(trimmed)) return null;
  const base = new URL(pagePath, SITE.url);
  let url: URL;
  try {
    url = new URL(trimmed, base);
  } catch {
    return null;
  }
  if (url.origin !== base.origin) return null;
  return url.pathname + url.hash;
}

/**
 * Reads the facts of one built page.
 *
 * @param path - The page's path with trailing slash.
 * @param html - Its HTML.
 */
export function readPage(path: string, html: string): PageFacts {
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (_whole, name: string) => `<${name}>`);
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(markup)?.[1] ?? "").trim();
  const facts: PageFacts = {
    path,
    title,
    description: "",
    canonical: "",
    ogImage: null,
    alternates: [],
    links: [],
    ids: [],
    samples: [],
    stub: false,
  };
  for (const { name, attrs } of tags(markup)) {
    const id = attrs.get("id");
    if (id) facts.ids.push(id);
    const sample = attrs.get("data-sample");
    if (sample) facts.samples.push(sample);
    const rel = attrs.get("rel")?.toLowerCase().split(/\s+/) ?? [];
    if (name === "meta" && attrs.get("name") === "description") facts.description = (attrs.get("content") ?? "").trim();
    else if (name === "meta" && attrs.get("property") === "og:image") facts.ogImage = attrs.get("content") ?? null;
    else if (name === "link" && rel.includes("canonical")) facts.canonical = attrs.get("href") ?? "";
    else if (name === "link" && rel.includes("alternate") && attrs.has("hreflang")) facts.alternates.push(attrs.get("hreflang")!);
    else if (name === "main" && attrs.has("data-stub")) facts.stub = true;
    else if (name === "a" && attrs.has("href")) {
      const target = internalTarget(attrs.get("href")!, path);
      if (target) facts.links.push(target);
    }
  }
  return facts;
}

const langOf = (path: string) => (path === "/ar/" || path.startsWith("/ar/") ? "ar" : "en");

/** Reports each value that more than one page of the same language uses. */
function duplicates(pages: PageFacts[], field: "title" | "description"): string[] {
  const byValue = new Map<string, string[]>();
  for (const page of pages) {
    const value = page[field].trim();
    if (!value) continue;
    const key = `${langOf(page.path)}\u0000${value}`;
    byValue.set(key, [...(byValue.get(key) ?? []), page.path]);
  }
  return [...byValue.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([key, paths]) => `duplicate ${field} "${key.split("\u0000")[1]}" on ${paths.join(", ")}`);
}

/**
 * Head problems: an empty or duplicate title or description (duplicates are
 * counted per language, so an untranslated Arabic page may share its English
 * twin's), a canonical that is not `SITE.url` + path, and missing
 * `en`/`ar`/`x-default` alternates.
 */
export function findMetaProblems(pages: PageFacts[]): string[] {
  const problems: string[] = [];
  for (const page of pages) {
    if (!page.title.trim()) problems.push(`empty title on ${page.path}`);
    if (!page.description.trim()) problems.push(`empty description on ${page.path}`);
    const expected = SITE.url + page.path;
    if (page.canonical !== expected) problems.push(`canonical on ${page.path} is "${page.canonical}", expected "${expected}"`);
    const missing = ["en", "ar", "x-default"].filter((lang) => !page.alternates.includes(lang));
    if (missing.length) problems.push(`missing hreflang alternates ${missing.join(", ")} on ${page.path}`);
  }
  return [...problems, ...duplicates(pages, "title"), ...duplicates(pages, "description")];
}

/**
 * Internal links that lead nowhere: a path with no page (and not one of the
 * given `files`, such as `/llms.txt`), or a `#id` the target page does not have.
 *
 * @param pages - Every page of the site.
 * @param files - Paths of other built files a link may point at.
 */
export function findDeadLinks(pages: PageFacts[], files: ReadonlySet<string> = new Set()): string[] {
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const idsOf = new Map<string, Set<string>>();
  const problems: string[] = [];
  for (const page of pages) {
    for (const link of new Set(page.links)) {
      const hashAt = link.indexOf("#");
      const path = hashAt === -1 ? link : link.slice(0, hashAt);
      let hash = "";
      try {
        hash = hashAt === -1 ? "" : decodeURIComponent(link.slice(hashAt + 1));
      } catch {
        problems.push(`dead link ${link} on ${page.path}: malformed escape in its anchor`);
        continue;
      }
      const target = byPath.get(path);
      if (!target) {
        if (!files.has(path)) problems.push(`dead link ${link} on ${page.path}: no such page`);
        continue;
      }
      if (!hash) continue;
      let ids = idsOf.get(path);
      if (!ids) idsOf.set(path, (ids = new Set(target.ids)));
      if (!ids.has(hash)) problems.push(`dead link ${link} on ${page.path}: ${path} has no id "${hash}"`);
    }
  }
  return problems;
}

/** Sample names that no page shows, sorted. */
export function findUnusedSamples(pages: PageFacts[], names: string[]): string[] {
  const used = new Set(pages.flatMap((page) => page.samples));
  return names.filter((name) => !used.has(name)).sort();
}
