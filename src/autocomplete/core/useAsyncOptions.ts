"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Options page
 *
 * One page of results. A missing `nextPage` means this was the last one.
 *
 * @typeParam TOption - The option type.
 */
export interface OptionsPage<TOption> {
  /** The options on this page. */
  data: TOption[];
  /** The cursor for the next page, if there is one. */
  nextPage?: number;
}

/**
 * useAsyncOptions options
 *
 * @typeParam TOption - The option type.
 */
export interface UseAsyncOptionsOptions<TOption> {
  /**
   * Fetches one page. The signal aborts when a newer search supersedes this
   * one, so pass it to `fetch` or axios and cancellation is free.
   */
  load: (query: string, page: number, signal: AbortSignal) => Promise<OptionsPage<TOption>>;
  /** Milliseconds to wait after typing stops. Default 300. */
  debounce?: number;
  /** Don't search until the query is this long. Default 0. */
  minChars?: number;
  /**
   * Gates fetching. Pass the popup's open state and nothing is requested
   * until the picker is opened; without it, every picker on a page issues a
   * request as soon as it mounts.
   */
  enabled?: boolean;
  /** Read once when the query changes; a later page appends to it. */
  keepPreviousData?: boolean;
}

/**
 * Async options
 *
 * The opt-in half of the component: `<Autocomplete>` renders only what it is
 * given, and this supplies remote options — debounced, abortable, paged, and
 * safe against out-of-order responses — as props to spread straight in.
 *
 * It covers what a query library, a debounce helper and an infinite-scroll
 * component would otherwise be needed for, without adding a dependency. When
 * one of those is already in the project, skip the hook and pass the same
 * props directly.
 *
 * @typeParam TOption - The option type.
 * @param options - See {@link UseAsyncOptionsOptions}.
 * @returns Props for `<Autocomplete>`, plus `reload`.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * const brands = useAsyncOptions({
 *   load: (query, page, signal) => api.brands({ query, page, signal }),
 *   enabled: open,
 * });
 *
 * <Autocomplete {...brands} open={open} onOpenChange={setOpen} value={brandId} onChange={setBrandId} />;
 * ```
 */
export function useAsyncOptions<TOption>({
  load,
  debounce = 300,
  minChars = 0,
  enabled = true,
  keepPreviousData = true,
}: UseAsyncOptionsOptions<TOption>) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TOption[]>([]);
  const [nextPage, setNextPage] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  /** Only the newest request may write; a late answer is dropped, not applied. */
  const sequence = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const latestLoad = useRef(load);
  latestLoad.current = load;

  const run = useCallback(
    async (nextQuery: string, page: number) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      const id = ++sequence.current;

      if (page === 1) {
        setLoading(true);
        if (!keepPreviousData) setOptions([]);
      } else {
        setLoadingMore(true);
      }
      setError(undefined);

      try {
        const result = await latestLoad.current(nextQuery, page, controller.signal);
        if (id !== sequence.current) return;
        setOptions((previous) => (page === 1 ? result.data : [...previous, ...result.data]));
        setNextPage(result.nextPage);
      } catch (cause) {
        if (controller.signal.aborted || id !== sequence.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        if (page === 1) setOptions([]);
      } finally {
        if (id === sequence.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [keepPreviousData],
  );

  /** Typing restarts at page one, once the debounce settles. */
  useEffect(() => {
    if (!enabled) return;
    if (query.trim().length < minChars) {
      setOptions([]);
      setNextPage(undefined);
      setError(undefined);
      return;
    }
    const timer = setTimeout(() => void run(query, 1), debounce);
    return () => clearTimeout(timer);
  }, [query, enabled, minChars, debounce, run]);

  /** Unmounting mid-flight must not leave a request running. */
  useEffect(() => () => inFlight.current?.abort(), []);

  const onLoadMore = useCallback(() => {
    if (nextPage === undefined || loading || loadingMore) return;
    void run(query, nextPage);
  }, [nextPage, loading, loadingMore, run, query]);

  const onRetry = useCallback(() => void run(query, 1), [run, query]);

  return {
    options,
    loading,
    loadingMore,
    error,
    hasMore: nextPage !== undefined,
    minChars,
    /** Remote results are already narrowed; filtering again would hide rows. */
    filter: false as const,
    onSearchChange: setQuery,
    onLoadMore,
    onRetry,
    /** Refetch the current query from page one. */
    reload: onRetry,
  };
}
