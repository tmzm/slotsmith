import { SITE } from "../../site.config.ts";
import { LANGS, localePath, t, type Lang } from "@/i18n";

/** The document title: the positioning on the landing, "<title> · slotsmith" everywhere else. */
export function pageTitle(lang: Lang, title: string | null): string {
  const name = t(lang, "site.name");
  return title === null ? `${t(lang, "site.positioning")} · ${name}` : `${title} · ${name}`;
}

/** The absolute URL of a page in one language. */
export function canonicalUrl(lang: Lang, path: string): string {
  return SITE.url + localePath(lang, path);
}

/** The GitHub edit link for a file under `docs/`. */
export function editUrl(sourcePath: string): string {
  return `${SITE.repo}/edit/${SITE.branch}/${SITE.docsDir}/${sourcePath}`;
}

/** `hreflang` links for a language-neutral path: every language, then x-default (English). */
export function alternates(path: string): { hreflang: string; href: string }[] {
  return [
    ...LANGS.map((lang) => ({ hreflang: lang, href: canonicalUrl(lang, path) })),
    { hreflang: "x-default", href: canonicalUrl("en", path) },
  ];
}
