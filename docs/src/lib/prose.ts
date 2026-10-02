import type { CollectionEntry } from "astro:content";
import type { Lang } from "@/i18n";

type DocsEntry = CollectionEntry<"docs">;

export interface Prose {
  entry: DocsEntry;
  lang: Lang;
  /** False when an Arabic page is showing its English entry. */
  translated: boolean;
  /** The MDX file the "Edit this page" link points at, relative to `docs/`. */
  sourcePath: string;
}

/** The entry's MDX file, relative to `docs/`. Its id drops a trailing `/index`, so the loader's own `filePath` is read first. */
const sourceOf = (entry: DocsEntry) => entry.filePath?.replace(/^\.\//, "") ?? `src/content/docs/${entry.id}.mdx`;

/** Resolves prose through an injected lookup, so it runs outside Astro. Returns undefined when English is missing. */
export function findProse(lang: Lang, slug: string, lookup: (id: string) => DocsEntry | undefined): Prose | undefined {
  const en = lookup(`en/${slug}`);
  if (!en) return undefined; // English is the source: an Arabic-only entry is an orphan
  if (lang === "ar") {
    const ar = lookup(`ar/${slug}`);
    if (ar) return { entry: ar, lang, translated: true, sourcePath: sourceOf(ar) };
  }
  return { entry: en, lang, translated: lang === "en", sourcePath: sourceOf(en) };
}

/** Like `findProse`, but a missing English entry is an error naming the slug. */
export function resolveProse(lang: Lang, slug: string, lookup: (id: string) => DocsEntry | undefined): Prose {
  const prose = findProse(lang, slug, lookup);
  if (!prose) throw new Error(`No prose for "${slug}": expected src/content/docs/en/${slug}.mdx.`);
  return prose;
}

async function lookupFromCollection(): Promise<(id: string) => DocsEntry | undefined> {
  const { getCollection } = await import("astro:content");
  const entries = new Map((await getCollection("docs")).map((entry) => [entry.id, entry]));
  return (id) => entries.get(id);
}

/** Prose for a page. Arabic falls back to English; a missing English entry throws. */
export async function getProse(lang: Lang, slug: string): Promise<Prose> {
  return resolveProse(lang, slug, await lookupFromCollection());
}

/** Prose for a page that may not have any yet (component pages and guides). */
export async function getOptionalProse(lang: Lang, slug: string): Promise<Prose | undefined> {
  return findProse(lang, slug, await lookupFromCollection());
}
