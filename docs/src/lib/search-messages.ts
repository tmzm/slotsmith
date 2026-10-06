/**
 * Search text built on the server: the dialog's UI text for one language
 * (passed to the island as a prop so it does not bundle the message
 * catalogs) and the section name a page is listed under in the results.
 */
import { t, type Lang } from "@/i18n";
import { NAV } from "@/nav";

export interface SearchMessages {
  title: string;
  placeholder: string;
  results: string;
  start: string;
  loading: string;
  /** Holds `{query}`. */
  empty: string;
  /** Holds `{count}`. */
  count: string;
  hint: string;
  close: string;
  devOnly: string;
  failed: string;
  /** The group for a result that names no section. */
  untitled: string;
}

export function searchMessages(lang: Lang): SearchMessages {
  return {
    title: t(lang, "search.title"),
    placeholder: t(lang, "search.placeholder"),
    results: t(lang, "search.results"),
    start: t(lang, "search.start"),
    loading: t(lang, "search.loading"),
    empty: t(lang, "search.empty"),
    count: t(lang, "search.count"),
    hint: t(lang, "search.hint"),
    close: t(lang, "common.close"),
    devOnly: t(lang, "search.devOnly"),
    failed: t(lang, "search.failed"),
    untitled: t(lang, "site.name"),
  };
}

/**
 * The section a page's search results are grouped under: the component's name
 * for a component page, otherwise the page's sidebar group.
 *
 * @param path - Language-neutral path with trailing slash.
 */
export function searchSection(lang: Lang, path: string): string {
  for (const group of NAV) {
    for (const item of group.items) {
      if (path.startsWith(item.path)) return t(lang, item.label);
    }
  }
  return t(lang, "site.name");
}
