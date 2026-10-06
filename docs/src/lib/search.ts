/**
 * Search, the parts with no DOM of their own: which key presses open the
 * dialog, and how Pagefind's page results become the grouped rows it lists.
 * Nothing here imports the message catalogs, so the header's loader stays small.
 */

/** A Pagefind page result, as far as the dialog reads it. */
export interface SearchPage {
  url: string;
  /** HTML: the text is escaped and each match is wrapped in `<mark>`. */
  excerpt: string;
  meta: { title?: string; section?: string };
  sub_results?: { title: string; url: string; excerpt: string }[];
}

export interface SearchRow {
  /** Unique in the list; the option's DOM id. */
  id: string;
  url: string;
  title: string;
  /** HTML, as `SearchPage.excerpt`. */
  excerpt: string;
  /** A heading inside the page of the row above it. */
  nested: boolean;
}

export interface SearchGroup {
  id: string;
  section: string;
  rows: SearchRow[];
}

/** Headings listed under one page, beside the page itself. */
const NESTED_PER_PAGE = 2;

/**
 * Groups page results by their section, in the order sections first appear
 * (Pagefind's ranking). Each page is one row, followed by its best-matching
 * headings as nested rows that link to the heading.
 *
 * @param pages - Pagefind results, best first.
 * @param untitled - The section name for a page that names none.
 */
export function groupResults(pages: SearchPage[], untitled: string): SearchGroup[] {
  const groups: SearchGroup[] = [];
  let count = 0;
  for (const page of pages) {
    const section = page.meta.section || untitled;
    let group = groups.find((candidate) => candidate.section === section);
    if (!group) {
      group = { id: `search-group-${groups.length}`, section, rows: [] };
      groups.push(group);
    }
    const row = (url: string, title: string, excerpt: string, nested: boolean): SearchRow => ({ id: `search-option-${count++}`, url, title, excerpt, nested });
    group.rows.push(row(page.url, page.meta.title || page.url, page.excerpt, false));
    const headings = (page.sub_results ?? []).filter((sub) => sub.url !== page.url).slice(0, NESTED_PER_PAGE);
    for (const sub of headings) group.rows.push(row(sub.url, sub.title, sub.excerpt, true));
  }
  return groups;
}

/** The parts of a key press the shortcut test reads. */
export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

const isTyping = (target: EventTarget | null): boolean =>
  typeof HTMLElement !== "undefined" && target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Whether a key press asks for search: Ctrl+K or ⌘K anywhere, or `/` outside
 * a text field.
 */
export function isSearchShortcut(event: ShortcutEvent): boolean {
  if (event.altKey) return false;
  if (event.ctrlKey || event.metaKey) return event.key.toLowerCase() === "k";
  return event.key === "/" && !isTyping(event.target);
}

/** The next active row for an arrow, Home or End key; wraps at both ends. Undefined for any other key or an empty list. */
export function nextActive(active: number, count: number, key: string): number | undefined {
  if (count === 0) return undefined;
  if (key === "ArrowDown") return (active + 1) % count;
  if (key === "ArrowUp") return (active - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}
