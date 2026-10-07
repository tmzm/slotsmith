"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { filterOptions, typeaheadMatch } from "./filter";
import type {
  AutocompleteStatus,
  GetOptionLabel,
  GetOptionValue,
  OptionFilter,
  OptionValue,
  ResolvedOption,
} from "./types";
import { useControllableState } from "../../shared/useControllableState";

/** How long a typeahead run stays open before the next key starts a new one. */
const TYPEAHEAD_TIMEOUT = 700;

/** How far `PageUp` / `PageDown` move. */
const PAGE_STEP = 10;

/**
 * useAutocomplete options
 *
 * Everything the engine needs. `<Autocomplete>` maps its public props onto
 * these, which is where the single / multiple union collapses into one
 * normalized array.
 *
 * @typeParam TOption - The option type.
 */
export interface UseAutocompleteOptions<TOption> {
  /** The options to render. */
  options: TOption[];
  /** Reads an option's id. Default: `option.value ?? option.id`. */
  getOptionValue?: GetOptionValue<TOption>;
  /** Reads an option's text. Default: `option.label ?? option.name`. */
  getOptionLabel?: GetOptionLabel<TOption>;
  /** Marks an option unselectable. It stays visible but cannot be landed on. */
  optionDisabled?: (option: TOption) => boolean;
  /** How to narrow options against the search. `false` filters nothing. */
  filter?: OptionFilter<TOption>;
  /** Options behind ids that may never appear in `options`, so they can be labelled. */
  selected?: TOption[];

  /** Several values at once, with the popup staying open on pick. */
  multiple?: boolean;
  /** The chosen ids. */
  value?: OptionValue[];
  /** The chosen ids while uncontrolled. */
  defaultValue?: OptionValue[];
  /** Told about every selection change, with the options index-aligned. */
  onValuesChange?: (values: OptionValue[], options: (TOption | undefined)[]) => void;

  /** Whether the search box renders. `false` makes it a select with typeahead. */
  searchable?: boolean;
  /** The search text. */
  searchQuery?: string;
  /** The search text while uncontrolled. */
  defaultSearchQuery?: string;
  /** Told when the search text changes, for remote options. */
  onSearchChange?: (query: string) => void;
  /** Don't search until this many characters are typed. */
  minChars?: number;

  /** Whether the popup is open. */
  open?: boolean;
  /** Whether the popup starts open. */
  defaultOpen?: boolean;
  /** Told when the popup opens or closes. */
  onOpenChange?: (open: boolean) => void;

  /** A first page is in flight. */
  loading?: boolean;
  /** The last fetch failed. Replaces the list. */
  error?: string;
  /** Offers a way back from the error. */
  onRetry?: () => void;
  /** Another page exists. */
  hasMore?: boolean;
  /** Asks for the next page. */
  onLoadMore?: () => void;
  /** That next page is in flight. */
  loadingMore?: boolean;

  /** Offers a "create <query>" row when the search matches nothing. */
  creatable?: boolean;
  /** Creates the searched name. */
  onCreate?: (query: string) => void;
  /** The create request is in flight. */
  createLoading?: boolean;

  /** Whether the clear control is offered. Default `true`. */
  clearable?: boolean;
  /** Whether picking closes the popup. Defaults to `!multiple`. */
  closeOnSelect?: boolean;
  /** Whether the highlight wraps past the ends. Default `false`. */
  loop?: boolean;
  /**
   * Highlight the first enabled option whenever the list opens or its
   * contents change, so Enter picks the top match. A highlight the user moved
   * themselves is kept until the search changes. Default `false`.
   */
  autoHighlight?: boolean;
  /** Nothing can be opened, picked or cleared. */
  disabled?: boolean;
  /** Told when focus leaves the whole control, for form libraries. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * Autocomplete model
 *
 * What the engine exposes: the resolved state, the actions, and prop getters
 * for the parts that need wiring.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteModel<TOption> {
  /** The options after filtering, in render order. */
  options: TOption[];
  /** What the list should show. See {@link AutocompleteStatus}. */
  status: AutocompleteStatus;
  /** The chosen ids. */
  values: OptionValue[];
  /** The chosen ids with their options, where known. */
  selected: ResolvedOption<TOption>[];
  /** Whether the popup is open. */
  open: boolean;
  /** Opens or closes it. */
  setOpen: (open: boolean) => void;
  /** The search text. */
  query: string;
  /** Sets the search text. */
  setQuery: (query: string) => void;
  /** Which option is highlighted, or -1. */
  highlightedIndex: number;
  /** Moves the highlight. */
  setHighlightedIndex: (index: number) => void;

  /** Reads an option's id. */
  getOptionValue: GetOptionValue<TOption>;
  /** Reads an option's text. */
  getOptionLabel: GetOptionLabel<TOption>;
  /** Finds the option behind an id, including ones no longer in `options`. */
  findOption: (value: OptionValue) => TOption | undefined;
  /** Whether an id is chosen. */
  isSelected: (value: OptionValue) => boolean;
  /** Whether an option can be picked. */
  isOptionDisabled: (option: TOption) => boolean;

  /** Picks an id, toggling it in multiple mode. */
  select: (value: OptionValue) => void;
  /** Removes one id. */
  remove: (value: OptionValue) => void;
  /** Removes every id. */
  clear: () => void;
  /** Whether a "create" row should be offered right now. */
  canCreate: boolean;
  /** Creates the searched name. */
  create: () => void;
  /** Asks for the next page. */
  loadMore: () => void;

  /** Whether anything is interactive. */
  disabled: boolean;
  /** Whether the search box renders. */
  searchable: boolean;
  /** Whether several values are allowed. */
  multiple: boolean;
  /** Whether the clear control should render. */
  showClear: boolean;
  /** Another page exists. */
  hasMore: boolean;
  /** That page is in flight. */
  loadingMore: boolean;
  /** A first page is in flight. */
  loading: boolean;
  /** The last fetch's message. */
  error?: string;
  /** Retries it. */
  onRetry?: () => void;
  /** Whether a create request is in flight. */
  createLoading: boolean;
  /** How many characters are still needed before a search runs. */
  minChars: number;

  /** Stable ids for the aria wiring. */
  ids: { root: string; trigger: string; list: string; option: (index: number) => string };
  /** The id `aria-activedescendant` should point at, if any. */
  activeDescendant?: string;

  /** The element the popup is positioned against. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** The scroll box the options live in. */
  listRef: React.RefObject<HTMLElement | null>;
  /** The search box, focused when the popup opens. */
  searchRef: React.RefObject<HTMLInputElement | null>;
  /** The whole control, for the outside-click check. */
  rootRef: React.RefObject<HTMLElement | null>;
  /** The paging sentinel. */
  sentinelRef: React.RefObject<HTMLElement | null>;

  /** Props for the `Trigger` part. */
  getTriggerProps: () => Record<string, unknown>;
  /** Props for the `Search` part. */
  getSearchProps: () => Record<string, unknown>;
  /** Props for the `List` part. */
  getListProps: () => Record<string, unknown>;
  /** Props for one `Option` part. */
  getOptionProps: (option: TOption, index: number) => Record<string, unknown>;
  /** Props for the `Root` part. */
  getRootProps: () => Record<string, unknown>;
}

const defaultGetOptionValue = <TOption,>(option: TOption): OptionValue => {
  const record = option as Record<string, unknown>;
  const value = record?.value ?? record?.id;
  return typeof value === "number" ? value : String(value);
};

const defaultGetOptionLabel = <TOption,>(option: TOption): string => {
  const record = option as Record<string, unknown>;
  return String(record?.label ?? record?.name ?? "");
};

/**
 * useAutocomplete
 *
 * The engine behind `<Autocomplete>`: selection, the search, the highlight,
 * the full keyboard path and the aria wiring — with no opinion about markup.
 * Use it directly to build a shape the component does not cover, such as an
 * editable input trigger or a command palette.
 *
 * @typeParam TOption - The option type.
 * @param options - See {@link UseAutocompleteOptions}.
 * @returns See {@link AutocompleteModel}.
 *
 * @example
 * ```tsx
 * const model = useAutocomplete({ options: countries, value: [code], onValuesChange: ([next]) => setCode(next) });
 * return (
 *   <div {...model.getRootProps()}>
 *     <div {...model.getTriggerProps()}>{model.selected[0]?.option?.name ?? "Pick one"}</div>
 *     {model.open && (
 *       <ul {...model.getListProps()}>
 *         {model.options.map((option, index) => (
 *           <li key={model.getOptionValue(option)} {...model.getOptionProps(option, index)}>
 *             {model.getOptionLabel(option)}
 *           </li>
 *         ))}
 *       </ul>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useAutocomplete<TOption>(options: UseAutocompleteOptions<TOption>): AutocompleteModel<TOption> {
  const {
    options: allOptions,
    getOptionValue = defaultGetOptionValue,
    getOptionLabel = defaultGetOptionLabel,
    optionDisabled,
    filter,
    selected: selectedOptions,
    multiple = false,
    searchable = true,
    minChars = 0,
    loading = false,
    error,
    onRetry,
    hasMore = false,
    onLoadMore,
    loadingMore = false,
    creatable = false,
    onCreate,
    createLoading = false,
    clearable = true,
    closeOnSelect = !multiple,
    loop = false,
    autoHighlight = false,
    disabled = false,
    onBlur,
  } = options;

  const reactId = useId();
  const ids = useMemo(
    () => ({
      root: `${reactId}-root`,
      trigger: `${reactId}-trigger`,
      list: `${reactId}-list`,
      option: (index: number) => `${reactId}-option-${index}`,
    }),
    [reactId],
  );

  const rootRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLElement | null>(null);

  const [open, setOpenState] = useControllableState(options.open, options.defaultOpen ?? false, options.onOpenChange);
  const [query, setQueryState] = useControllableState(
    options.searchQuery,
    options.defaultSearchQuery ?? "",
    options.onSearchChange,
  );
  const [values, setValues] = useControllableState<OptionValue[]>(options.value, options.defaultValue ?? []);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  /**
   * Whether the user moved the highlight since the list opened or the search
   * last changed. `autoHighlight` leaves such a highlight alone.
   */
  const highlightMoved = useRef(false);
  const moveHighlight = useCallback((index: number) => {
    highlightMoved.current = true;
    setHighlightedIndex(index);
  }, []);

  const onValuesChangeRef = useRef(options.onValuesChange);
  onValuesChangeRef.current = options.onValuesChange;

  /**
   * Every option seen so far, kept by value.
   *
   * A selected option is often no longer in `options` by the time it has to
   * be labelled, because the search narrowed the list or paging moved past
   * it. Without this cache the trigger would render blank.
   */
  const cache = useRef(new Map<OptionValue, TOption>());
  for (const option of allOptions) cache.current.set(getOptionValue(option), option);
  for (const option of selectedOptions ?? []) cache.current.set(getOptionValue(option), option);

  const findOption = useCallback(
    (value: OptionValue) => cache.current.get(value),
    [],
  );

  const isOptionDisabled = useCallback(
    (option: TOption) => optionDisabled?.(option) ?? false,
    [optionDisabled],
  );

  const visible = useMemo(
    () => filterOptions(allOptions, searchable ? query : "", filter, getOptionLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOptions, query, searchable, filter],
  );

  const belowMinChars = searchable && minChars > 0 && query.trim().length < minChars;

  const status: AutocompleteStatus = error
    ? "error"
    : loading && visible.length === 0
      ? "loading"
      : belowMinChars && visible.length === 0
        ? "min-chars"
        : visible.length === 0
          ? "empty"
          : "ready";

  const selected = useMemo<ResolvedOption<TOption>[]>(
    () => values.map((value) => ({ value, option: findOption(value) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, allOptions, selectedOptions],
  );

  const emit = useCallback(
    (next: OptionValue[]) => {
      setValues(next);
      onValuesChangeRef.current?.(
        next,
        next.map((value) => cache.current.get(value)),
      );
    },
    [setValues],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return;
      setOpenState(next);
      if (!next) {
        /** Reopening must never show the previous query's results. */
        setQueryState("");
        setHighlightedIndex(-1);
        highlightMoved.current = false;
      }
    },
    [disabled, setOpenState, setQueryState],
  );

  const setQuery = useCallback(
    (next: string) => {
      setQueryState(next);
      setHighlightedIndex(-1);
      highlightMoved.current = false;
    },
    [setQueryState],
  );

  const isSelected = useCallback((value: OptionValue) => values.includes(value), [values]);

  const select = useCallback(
    (value: OptionValue) => {
      if (disabled) return;
      const option = cache.current.get(value);
      if (option && isOptionDisabled(option)) return;

      if (multiple) {
        emit(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);
      } else {
        emit([value]);
      }
      if (closeOnSelect) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [disabled, isOptionDisabled, multiple, values, emit, closeOnSelect, setOpen],
  );

  const remove = useCallback(
    (value: OptionValue) => {
      if (disabled) return;
      emit(values.filter((entry) => entry !== value));
    },
    [disabled, emit, values],
  );

  const clear = useCallback(() => {
    if (disabled) return;
    emit([]);
  }, [disabled, emit]);

  const searched = query.trim();
  /**
   * Creating is offered only once the search has settled and returned
   * nothing. Offering it while results are still arriving invites a duplicate
   * of a record that was about to appear, so the caller's `loading` is
   * respected as well as the query itself.
   */
  const canCreate = creatable && !!searched && visible.length === 0 && !loading && !error && !belowMinChars;

  const create = useCallback(() => {
    if (!searched) return;
    onCreate?.(searched);
  }, [onCreate, searched]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    onLoadMore?.();
  }, [hasMore, loadingMore, loading, onLoadMore]);

  /* ------------------------------------------------------------- highlight */

  const clampIndex = useCallback(
    (index: number) => {
      if (visible.length === 0) return -1;
      if (index < 0) return loop ? visible.length - 1 : 0;
      if (index >= visible.length) return loop ? 0 : visible.length - 1;
      return index;
    },
    [visible.length, loop],
  );

  /** Steps past options that cannot be landed on, giving up at the ends. */
  const nextEnabled = useCallback(
    (from: number, step: number) => {
      if (visible.length === 0) return -1;
      let index = from;
      for (let guard = 0; guard < visible.length; guard += 1) {
        index = clampIndex(index + step);
        const option = visible[index];
        if (option && !isOptionDisabled(option)) return index;
        /** At a hard end with nowhere left to go. */
        if (!loop && (index === 0 || index === visible.length - 1)) {
          const fallback = visible.findIndex((entry) => !isOptionDisabled(entry));
          return step > 0 ? index : fallback;
        }
      }
      return -1;
    },
    [visible, clampIndex, isOptionDisabled, loop],
  );

  const firstEnabled = useCallback(
    () => visible.findIndex((option) => !isOptionDisabled(option)),
    [visible, isOptionDisabled],
  );

  const lastEnabled = useCallback(() => {
    for (let index = visible.length - 1; index >= 0; index -= 1) {
      if (!isOptionDisabled(visible[index]!)) return index;
    }
    return -1;
  }, [visible, isOptionDisabled]);

  /** A shorter list must not leave the highlight pointing past its end. */
  useEffect(() => {
    if (highlightedIndex >= visible.length) setHighlightedIndex(visible.length ? visible.length - 1 : -1);
  }, [visible.length, highlightedIndex]);

  /**
   * Auto highlight
   *
   * Lands on the first enabled option when the list opens and each time what
   * it shows changes — a new search, or a page arriving — unless the user has
   * moved the highlight since the search last changed.
   */
  useEffect(() => {
    if (!open) {
      highlightMoved.current = false;
      return;
    }
    if (!autoHighlight || highlightMoved.current) return;
    setHighlightedIndex(firstEnabled());
  }, [autoHighlight, open, firstEnabled]);

  /** Keep the highlighted row in view without scrolling the page. */
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const element = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  /* -------------------------------------------------------------- lifecycle */

  /** Opening moves focus to the search box, so typing goes straight to it. */
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  /** A pointer going down outside the control closes the popup. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen]);

  /** Paging is driven by the list's own scroll box, never the viewport. */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!open || !hasMore || !sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: listRef.current },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, loadMore, visible.length]);

  /* -------------------------------------------------------------- keyboard */

  const typeahead = useRef({ buffer: "", timer: 0 });

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const runTypeahead = useCallback(
    (key: string) => {
      window.clearTimeout(typeahead.current.timer);
      typeahead.current.buffer += key;
      typeahead.current.timer = window.setTimeout(() => {
        typeahead.current.buffer = "";
      }, TYPEAHEAD_TIMEOUT);

      const index = typeaheadMatch(
        visible,
        typeahead.current.buffer,
        highlightedIndex,
        getOptionLabel,
        isOptionDisabled,
      );
      if (index >= 0) moveHighlight(index);
      return index;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, highlightedIndex, isOptionDisabled, moveHighlight],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (disabled) return;

      if (!open) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpenState(true);
          moveHighlight(event.key === "ArrowUp" ? lastEnabled() : firstEnabled());
          return;
        }
        /** Typing opens: into the search box, or straight into typeahead. */
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          if (searchable) {
            setOpenState(true);
            return;
          }
          event.preventDefault();
          setOpenState(true);
          runTypeahead(event.key);
        }
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveHighlight(highlightedIndex < 0 ? firstEnabled() : nextEnabled(highlightedIndex, 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          moveHighlight(highlightedIndex < 0 ? lastEnabled() : nextEnabled(highlightedIndex, -1));
          break;
        case "Home":
          event.preventDefault();
          moveHighlight(firstEnabled());
          break;
        case "End":
          event.preventDefault();
          moveHighlight(lastEnabled());
          break;
        case "PageDown":
          event.preventDefault();
          moveHighlight(nextEnabled(Math.min(highlightedIndex + PAGE_STEP - 1, visible.length - 1), 1));
          break;
        case "PageUp":
          event.preventDefault();
          moveHighlight(nextEnabled(Math.max(highlightedIndex - PAGE_STEP + 1, 0), -1));
          break;
        case "Enter": {
          const option = visible[highlightedIndex];
          if (option) {
            event.preventDefault();
            select(getOptionValue(option));
          } else if (canCreate) {
            event.preventDefault();
            create();
          }
          break;
        }
        case "Escape":
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "Tab":
          setOpen(false);
          break;
        case "Backspace":
          /** Only when there is nothing to delete in the search box itself. */
          if (multiple && !query && values.length) {
            event.preventDefault();
            remove(values[values.length - 1]!);
          }
          break;
        default:
          if (!searchable && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            runTypeahead(event.key);
          }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      disabled, open, searchable, highlightedIndex, visible, canCreate, multiple, query, values,
      firstEnabled, lastEnabled, nextEnabled, select, create, setOpen, setOpenState, remove, runTypeahead,
      moveHighlight,
    ],
  );

  /** Focus leaving the whole control is what a form library calls "touched". */
  const onBlurCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && rootRef.current?.contains(next)) return;
      onBlur?.(event);
    },
    [onBlur],
  );

  /* ------------------------------------------------------------ prop getters */

  const activeDescendant =
    open && highlightedIndex >= 0 && visible[highlightedIndex] ? ids.option(highlightedIndex) : undefined;

  const getRootProps = useCallback(
    () => ({
      ref: rootRef,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-empty": values.length === 0 || undefined,
      onBlur: onBlurCapture,
    }),
    [open, disabled, values.length, onBlurCapture],
  );

  const getTriggerProps = useCallback(
    () => ({
      ref: triggerRef,
      id: ids.trigger,
      role: "combobox",
      tabIndex: disabled ? -1 : 0,
      "aria-expanded": open,
      "aria-haspopup": "listbox" as const,
      "aria-controls": open ? ids.list : undefined,
      /** Only while focus is actually here — with a search box it is not. */
      "aria-activedescendant": searchable ? undefined : activeDescendant,
      "aria-disabled": disabled || undefined,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-empty": values.length === 0 || undefined,
      onClick: () => (open ? setOpen(false) : setOpen(true)),
      onKeyDown,
    }),
    [ids, disabled, open, searchable, activeDescendant, values.length, setOpen, onKeyDown],
  );

  const getSearchProps = useCallback(
    () => ({
      ref: searchRef,
      value: query,
      role: "searchbox" as const,
      type: "text" as const,
      autoComplete: "off" as const,
      spellCheck: false,
      "aria-controls": ids.list,
      "aria-autocomplete": "list" as const,
      "aria-activedescendant": activeDescendant,
      onChange: (event: { target: { value: string } }) => setQuery(event.target.value),
      onKeyDown,
    }),
    [query, ids.list, activeDescendant, setQuery, onKeyDown],
  );

  const getListProps = useCallback(
    () => ({
      ref: listRef,
      id: ids.list,
      role: "listbox" as const,
      "aria-multiselectable": multiple || undefined,
      "aria-busy": loading || undefined,
    }),
    [ids.list, multiple, loading],
  );

  const getOptionProps = useCallback(
    (option: TOption, index: number) => {
      const value = getOptionValue(option);
      const optionIsDisabled = isOptionDisabled(option);
      return {
        id: ids.option(index),
        role: "option" as const,
        "aria-selected": values.includes(value),
        "aria-disabled": optionIsDisabled || undefined,
        "data-index": index,
        "data-highlighted": index === highlightedIndex || undefined,
        "data-selected": values.includes(value) || undefined,
        "data-disabled": optionIsDisabled || undefined,
        /** `pointermove`, not `pointerenter`: a list scrolling under a still cursor must not steal the highlight. */
        onPointerMove: (event: PointerEvent) => {
          if (event.movementX === 0 && event.movementY === 0) return;
          if (!optionIsDisabled && index !== highlightedIndex) moveHighlight(index);
        },
        onClick: () => select(value),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, values, highlightedIndex, isOptionDisabled, select, moveHighlight],
  );

  return {
    options: visible,
    status,
    values,
    selected,
    open,
    setOpen,
    query,
    setQuery,
    highlightedIndex,
    setHighlightedIndex,

    getOptionValue,
    getOptionLabel,
    findOption,
    isSelected,
    isOptionDisabled,

    select,
    remove,
    clear,
    canCreate,
    create,
    loadMore,

    disabled,
    searchable,
    multiple,
    showClear: clearable && values.length > 0 && !disabled,
    hasMore,
    loadingMore,
    loading,
    error,
    onRetry,
    createLoading,
    minChars,

    ids,
    activeDescendant,

    triggerRef,
    listRef,
    searchRef,
    rootRef,
    sentinelRef,

    getTriggerProps,
    getSearchProps,
    getListProps,
    getOptionProps,
    getRootProps,
  };
}
