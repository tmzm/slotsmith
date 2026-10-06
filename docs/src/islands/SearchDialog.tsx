/**
 * The search command palette (docs/DESIGN.md "Search"): a modal `<dialog>`
 * with a combobox input over a listbox of results, grouped by section.
 *
 * The header's loader (`components/Search.astro`) imports this file the first
 * time someone asks for search, so neither it nor Pagefind is in a page's
 * first load. Once mounted it handles the shortcuts and the `open-search`
 * window event itself. Pagefind's script and index come from `/pagefind/`,
 * which exists only on the built site (`pagefind --site dist`); it picks the
 * index by the page's `lang`, so `/ar/` pages get Arabic-site results. The dev
 * server has no index and says so.
 *
 * Keyboard: Ctrl+K or ⌘K toggles, `/` opens, arrows, Home and End move the
 * active row, Enter follows it (with Ctrl or ⌘, in a new tab), Escape closes.
 * Focus stays in the dialog while it is open and returns to where it was on
 * close; the page behind does not scroll meanwhile (search.css).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createRoot } from "react-dom/client";
// As text: a plain import would put the rules in every page's HTML.
import styles from "@/styles/search.css?inline";
import type { Lang } from "@/i18n";
import { groupResults, isSearchShortcut, nextActive, type SearchGroup, type SearchPage } from "@/lib/search";
import type { SearchMessages } from "@/lib/search-messages";

/** The part of Pagefind's module the dialog calls. */
export interface SearchEngine {
  options(options: { baseUrl?: string; excerptLength?: number }): Promise<void>;
  init(): Promise<void>;
  /** Resolves to null when a later call replaced this one. */
  debouncedSearch(query: string, options?: object, debounceMs?: number): Promise<{ results: { data(): Promise<SearchPage> }[] } | null>;
}

export interface SearchDialogProps {
  lang: Lang;
  messages: SearchMessages;
  /** Opens the dialog on mount: the loader mounts it in answer to a request to open. */
  defaultOpen?: boolean;
  /** Loads the search engine. Defaults to the built site's Pagefind bundle. */
  load?: () => Promise<SearchEngine>;
}

/** Pages listed per search; each may add nested heading rows. */
const MAX_PAGES = 8;
const DEBOUNCE_MS = 120;
const EXCERPT_WORDS = 18;
/** A search slower than this says "Searching…"; a faster one is not announced on every key press. */
const LOADING_NOTICE_MS = 300;

type Status = "idle" | "loading" | "ready" | "unavailable";

async function loadPagefind(): Promise<SearchEngine> {
  const base = import.meta.env.BASE_URL;
  // A runtime URL: the bundle is written into `dist` after the build, so the bundler must not resolve it.
  const engine = (await import(/* @vite-ignore */ `${base}pagefind/pagefind.js`)) as SearchEngine;
  await engine.options({ baseUrl: base, excerptLength: EXCERPT_WORDS });
  await engine.init();
  return engine;
}

export default function SearchDialog({ lang, messages, defaultOpen = false, load = loadPagefind }: SearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<Promise<SearchEngine> | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  /** The query the listed results answer. */
  const [answered, setAnswered] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const rows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);
  const activeRow = rows[active];

  /** One load per page: the first open starts it, every search awaits it. */
  const engine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = load();
      engineRef.current.catch(() => setStatus("unavailable"));
    }
    return engineRef.current;
  }, [load]);

  const close = useCallback(() => dialogRef.current?.close(), []);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    // Remembered here: browsers differ on what a modal dialog gives focus back to.
    openerRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    dialog.showModal();
    inputRef.current?.focus();
    inputRef.current?.select();
    void engine();
  }, [engine]);

  useEffect(() => {
    if (defaultOpen) open();
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      if (dialogRef.current?.open) close();
      else open();
    };
    window.addEventListener("open-search", open);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-search", open);
      window.removeEventListener("keydown", onKey);
    };
  }, [defaultOpen, open, close]);

  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setGroups([]);
      setAnswered("");
      setStatus((current) => (current === "unavailable" ? current : "idle"));
      return;
    }
    let stale = false;
    const notice = setTimeout(() => setStatus((current) => (current === "unavailable" ? current : "loading")), LOADING_NOTICE_MS);
    engine()
      .then(async (pagefind) => {
        const search = await pagefind.debouncedSearch(text, {}, DEBOUNCE_MS);
        if (!search || stale) return;
        const pages = await Promise.all(search.results.slice(0, MAX_PAGES).map((result) => result.data()));
        if (stale) return;
        clearTimeout(notice);
        setGroups(groupResults(pages, messages.untitled));
        setAnswered(text);
        setActive(0);
        setStatus("ready");
      })
      .catch(() => {
        if (!stale) setStatus("unavailable");
      });
    return () => {
      stale = true;
      clearTimeout(notice);
    };
  }, [query, engine, messages.untitled]);

  useEffect(() => {
    if (activeRow) document.getElementById(activeRow.id)?.scrollIntoView?.({ block: "nearest" });
  }, [activeRow]);

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!activeRow) return;
      if (event.ctrlKey || event.metaKey) {
        window.open(activeRow.url, "_blank", "noopener");
        close();
      } else {
        // The row is a link: clicking it navigates and closes, as a pointer would.
        document.getElementById(activeRow.id)?.click();
      }
      return;
    }
    // With nothing listed, Home and End keep moving the caret.
    const next = nextActive(active, rows.length, event.key);
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };

  /** Tab stays inside the dialog; the browser's own modal focus would also visit its toolbar. */
  const onDialogKey = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const stops = [...event.currentTarget.querySelectorAll<HTMLElement>("input, button")];
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const listed = rows.length > 0 && status !== "unavailable";
  let message = messages.start;
  if (status === "unavailable") message = import.meta.env.DEV ? messages.devOnly : messages.failed;
  else if (listed) message = messages.count.replace("{count}", String(rows.length));
  else if (status === "loading") message = messages.loading;
  else if (status === "ready" && answered) message = messages.empty.replace("{query}", answered);

  return (
    <dialog
      ref={dialogRef}
      className="search"
      lang={lang}
      aria-label={messages.title}
      onKeyDown={onDialogKey}
      onClose={() => openerRef.current?.focus()}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className="search__field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          className="search__input"
          type="text"
          inputMode="search"
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          dir="auto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKey}
          placeholder={messages.placeholder}
          aria-label={messages.placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listed}
          aria-controls={listed ? "search-list" : undefined}
          aria-activedescendant={listed ? activeRow?.id : undefined}
        />
        <button type="button" className="search__close" aria-label={messages.close} onClick={close}>
          <kbd aria-hidden="true">Esc</kbd>
        </button>
      </div>
      <p className={listed ? "visually-hidden" : "search__message"} role="status" data-status={status} data-query={answered}>
        {message}
      </p>
      {listed && (
        <div className="search__list" id="search-list" role="listbox" aria-label={messages.results}>
          {groups.map((group) => (
            <div key={group.id} role="group" aria-labelledby={group.id}>
              <p className="search__group" id={group.id} role="presentation">
                {group.section}
              </p>
              {group.rows.map((row) => (
                <a
                  key={row.id}
                  id={row.id}
                  className="search__row"
                  role="option"
                  aria-selected={row === activeRow}
                  data-nested={row.nested || undefined}
                  tabIndex={-1}
                  href={row.url}
                  onMouseMove={() => setActive(rows.indexOf(row))}
                  onClick={close}
                >
                  <span className="search__marker" aria-hidden="true">
                    {">"}
                  </span>
                  <span className="search__text">
                    <span className="search__title" dir="auto">
                      {row.title}
                    </span>
                    {/* Pagefind escapes the page text and adds only <mark>. */}
                    {row.excerpt && <span className="search__excerpt" dir="auto" dangerouslySetInnerHTML={{ __html: row.excerpt }} />}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="search__hint mono" aria-hidden="true">
        {messages.hint}
      </p>
    </dialog>
  );
}

/**
 * Mounts the dialog, open, in a new element at the end of `<body>` (outside
 * the header, which goes inert while the sidebar sheet is open), after adding
 * its stylesheet to the page.
 */
export function mountSearch(props: Omit<SearchDialogProps, "defaultOpen">): void {
  const sheet = document.createElement("style");
  sheet.textContent = styles;
  document.head.append(sheet);
  const host = document.createElement("div");
  host.id = "search-root";
  document.body.append(host);
  createRoot(host).render(<SearchDialog {...props} defaultOpen />);
}
