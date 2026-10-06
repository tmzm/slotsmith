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
  /** HTML, as `SearchPage.excerpt`; empty when the row below shows the same text. */
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
 * headings as nested rows that link to the heading. A page whose excerpt is
 * its first heading's shows it once, on the heading.
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
    const headings = (page.sub_results ?? []).filter((sub) => sub.url !== page.url).slice(0, NESTED_PER_PAGE);
    group.rows.push(row(page.url, page.meta.title || page.url, headings[0]?.excerpt === page.excerpt ? "" : page.excerpt, false));
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
  shiftKey: boolean;
  /** True while a held key repeats. */
  repeat: boolean;
  /** True when something on the page already handled the key. */
  defaultPrevented: boolean;
  target: EventTarget | null;
}

/** Where a typed slash belongs to the page: text fields, widgets that take typed characters, and the live demos. */
const TYPING = "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=combobox], [role=listbox], [role=textbox], [role=searchbox], [data-sample]";

const isTyping = (target: EventTarget | null): boolean => {
  const element = target as { closest?: (selector: string) => unknown; isContentEditable?: boolean } | null;
  if (typeof element?.closest !== "function") return false;
  return element.isContentEditable === true || element.closest(TYPING) !== null;
};

/**
 * Whether a key press asks for search: Ctrl+K or ⌘K anywhere (not with Shift
 * or Alt, which browsers use), or a bare `/` that nothing else handled,
 * pressed outside text fields, typeahead widgets and demos. A repeating key
 * never counts.
 */
export function isSearchShortcut(event: ShortcutEvent): boolean {
  if (event.repeat || event.altKey) return false;
  if (event.ctrlKey || event.metaKey) return !event.shiftKey && event.key.toLowerCase() === "k";
  return event.key === "/" && !event.defaultPrevented && !isTyping(event.target);
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
