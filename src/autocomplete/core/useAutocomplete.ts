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
import { groupOptions, type AutocompleteSection, type GetOptionGroup } from "./groups";
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
  /**
   * Reads an option's id. Default: `option.value ?? option.id`. Every
   * option's value must be unique: it keys the rows and builds their DOM ids,
   * so two options with one value would share an id.
   */
  getOptionValue?: GetOptionValue<TOption>;
  /** Reads an option's text. Default: `option.label ?? option.name`. */
  getOptionLabel?: GetOptionLabel<TOption>;
  /** Marks an option unselectable. It stays visible but cannot be landed on. */
  optionDisabled?: (option: TOption) => boolean;
  /**
   * Reads the group an option belongs to, which is also the group's label.
   * The options stay one flat list: groups appear in the order their first
   * option does, an option joins its group wherever it sits (a later page
   * included), and the options with no group form one unlabelled section
   * where the first of them appeared. A group the search empties disappears
   * with its label and separator. Read whenever the options or the search
   * change.
   */
  getOptionGroup?: GetOptionGroup<TOption>;
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
  /**
   * Where the search box sits. `"popup"` puts it at the top of the popup,
   * behind a trigger that is a button. `"trigger"` makes the trigger an
   * editable combobox: an input inside the field, which keeps focus the whole
   * time, shows the picked label while closed in single mode, and sits after
   * the tags in multiple mode. Ignored when `searchable` is `false`, which
   * keeps the button trigger. Default `"popup"`.
   */
  searchIn?: "popup" | "trigger";
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
  /**
   * The value failed validation. Sets `aria-invalid` on the combobox and
   * `data-invalid` on the root and trigger, so a skin can show its error
   * style. Pair it with `aria-errormessage` or `aria-describedby` pointing at
   * the message. Default `false`.
   */
  invalid?: boolean;
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
  /** The options after filtering, in render order: section by section when `getOptionGroup` is set. */
  options: TOption[];
  /**
   * The options as the sections they render in. Without `getOptionGroup` it
   * is one ungrouped section holding every option. An option's index in
   * `options` is its section's `start` plus its position in the section.
   */
  sections: AutocompleteSection<TOption>[];
  /** Whether `getOptionGroup` is set, so the list renders groups. */
  grouped: boolean;
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
  /** Whether the value failed validation. */
  invalid: boolean;
  /** Whether the search box renders. */
  searchable: boolean;
  /**
   * Where the search box sits, as it takes effect: `"trigger"` only when
   * `searchable` is on, so the input inside the trigger is the combobox.
   */
  searchIn: "popup" | "trigger";
  /**
   * What the input inside the trigger shows: the search text, or, in single
   * mode while closed with nothing typed, the picked option's label.
   */
  inputValue: string;
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
  ids: {
    root: string;
    trigger: string;
    list: string;
    option: (index: number) => string;
    /** The id of a group's label element, from the group's name. */
    group: (group: string) => string;
  };
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
  /**
   * Props for the `TriggerInput` part, the input that is the combobox when
   * `searchIn` is `"trigger"`. Its ref is `searchRef`.
   */
  getTriggerInputProps: () => Record<string, unknown>;
  /** Props for the `Toggle` part: a button outside the tab order that opens and closes the list. */
  getToggleProps: () => Record<string, unknown>;
  /**
   * Props for the `Popup` part. With the search in the trigger, a press
   * inside the popup is kept from taking focus out of the input.
   */
  getPopupProps: () => Record<string, unknown>;
  /** Props for the `List` part. */
  getListProps: () => Record<string, unknown>;
  /** Props for one `Option` part. */
  getOptionProps: (option: TOption, index: number) => Record<string, unknown>;
  /** Props for a group's wrapper: `role="group"`, labelled by its label element. */
  getGroupProps: (section: AutocompleteSection<TOption>) => Record<string, unknown>;
  /** Props for a group's label element: its id, and `role="presentation"` so it is not read as an item. */
  getGroupLabelProps: (section: AutocompleteSection<TOption>) => Record<string, unknown>;
  /** Props for the line between two sections: presentational and hidden from assistive technology. */
  getSeparatorProps: () => Record<string, unknown>;
  /** Props for the `Root` part. */
  getRootProps: () => Record<string, unknown>;
}

const defaultGetOptionValue = <TOption,>(option: TOption): OptionValue => {
  const record = option as Record<string, unknown>;
  const value = record?.value ?? record?.id;
  return typeof value === "number" ? value : String(value);
};

/**
 * Id fragment
 *
 * Turns an option's value into a stable, whitespace-free fragment of an HTML
 * id. Anything outside `[A-Za-z0-9-]` is written as `_` plus its code point,
 * so distinct values never collide, and numbers and strings are kept apart.
 *
 * @param value - The option's value.
 * @returns The fragment.
 */
const idFragment = (value: OptionValue): string =>
  (typeof value === "number" ? "n" : "s") +
  String(value).replace(/[^A-Za-z0-9-]/gu, (character) => `_${character.codePointAt(0)!.toString(36)}_`);

const defaultGetOptionLabel = <TOption,>(option: TOption): string => {
  const record = option as Record<string, unknown>;
  return String(record?.label ?? record?.name ?? "");
};

/**
 * Is composing
 *
 * Whether a key press belongs to an input method composition, as when
 * typing Japanese or Chinese. Enter then confirms the composed text, so it
 * must not also pick an option. Some browsers report only `keyCode` 229.
 *
 * @param event - The key press.
 * @returns Whether to leave it to the input method.
 */
const isComposing = (event: KeyboardEvent<HTMLElement>) =>
  (event.nativeEvent as globalThis.KeyboardEvent | undefined)?.isComposing === true || event.keyCode === 229;

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
    getOptionGroup,
    filter,
    selected: selectedOptions,
    multiple = false,
    searchable = true,
    searchIn: searchInOption = "popup",
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
    invalid = false,
    onBlur,
  } = options;

  const reactId = useId();
  /** The input inside the trigger is the combobox only when there is a search at all. */
  const inTrigger = searchable && searchInOption === "trigger";

  const rootRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLElement | null>(null);

  /** Focus returns to whichever element is the combobox. */
  const focusCombobox = useCallback(
    () => (inTrigger ? searchRef.current : triggerRef.current)?.focus(),
    [inTrigger],
  );

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

  const filtered = useMemo(
    () => filterOptions(allOptions, searchable ? query : "", filter, getOptionLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOptions, query, searchable, filter],
  );

  /**
   * Grouping runs on the filtered list, so a group the search empties goes
   * with its label. It is keyed on that list rather than on
   * `getOptionGroup`, which is usually an inline function, so the sections
   * stay stable between renders — the way `getOptionLabel` is treated.
   */
  const grouped = !!getOptionGroup;
  const groupLabelId = useCallback((group: string) => `${reactId}-group-${idFragment(group)}`, [reactId]);
  const { options: visible, sections } = useMemo(
    () => groupOptions(filtered, getOptionGroup, groupLabelId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, grouped, groupLabelId],
  );

  /**
   * Option ids come from the option's value, not its position. When the
   * search narrows the list, the new top match then gets a new id, so
   * `aria-activedescendant` changes and a screen reader announces it.
   */
  const ids = useMemo(
    () => ({
      root: `${reactId}-root`,
      trigger: `${reactId}-trigger`,
      list: `${reactId}-list`,
      option: (index: number) => {
        const option = visible[index];
        return `${reactId}-option-${option === undefined ? `i${index}` : idFragment(getOptionValue(option))}`;
      },
      group: groupLabelId,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactId, visible, groupLabelId],
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

  /**
   * The option to highlight once a pick has cleared the search. In multiple
   * mode with the search in the trigger, picking empties the query so the
   * next search starts fresh, and the highlight follows the picked option
   * into the full list rather than jumping back to the top.
   */
  const highlightAfterPick = useRef<{ value: OptionValue } | null>(null);

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
        focusCombobox();
      } else if (inTrigger && query !== "") {
        highlightAfterPick.current = { value };
        setQuery("");
      }
    },
    [disabled, isOptionDisabled, multiple, values, emit, closeOnSelect, setOpen, focusCombobox, inTrigger, query, setQuery],
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
    /** The clear control sits beside the input; the input is where the user carries on. */
    if (inTrigger) searchRef.current?.focus();
  }, [disabled, emit, inTrigger]);

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

  /**
   * A parent closing a controlled popup skips `setOpen`, so the reset it
   * would have done happens here: the next open starts from nothing.
   */
  useEffect(() => {
    if (open) return;
    setHighlightedIndex(-1);
    highlightMoved.current = false;
  }, [open]);

  /**
   * Follow the highlighted option when the list changes under it
   *
   * A page that brings more of an earlier group inserts options above the
   * highlight, and new options can replace old ones without the search
   * changing. The highlight is an index, so it is moved back onto the same
   * option, or, when that option is gone, kept within the list. This runs
   * while rendering rather than in an effect, so no commit ever points
   * `aria-activedescendant` at whatever slid into the old position.
   */
  const [previousVisible, setPreviousVisible] = useState(visible);
  if (previousVisible !== visible) {
    setPreviousVisible(visible);
    let next = highlightedIndex;
    const option = highlightedIndex >= 0 ? previousVisible[highlightedIndex] : undefined;
    if (option !== undefined) {
      const value = getOptionValue(option);
      const index = visible.findIndex((entry) => getOptionValue(entry) === value);
      if (index >= 0) next = index;
    }
    if (next >= visible.length) next = visible.length ? visible.length - 1 : -1;
    if (next !== highlightedIndex) setHighlightedIndex(next);
  }

  /**
   * Auto highlight
   *
   * Lands on the first enabled option when the list opens and each time what
   * it shows changes — a new search, or a page arriving — unless the user has
   * moved the highlight since the search last changed. The search is a
   * dependency of its own, because a caller filtering remotely may hand back
   * the same array. While a first page is loading the rows on screen may be
   * the previous search's, so nothing is picked until it settles.
   */
  useEffect(() => {
    if (!open || !autoHighlight || highlightMoved.current || loading) return;
    setHighlightedIndex(firstEnabled());
  }, [autoHighlight, open, firstEnabled, query, loading]);

  /** Lands the highlight on an option just picked, once the cleared search has brought the full list back. */
  useEffect(() => {
    const pending = highlightAfterPick.current;
    if (!pending) return;
    highlightAfterPick.current = null;
    const index = visible.findIndex((option) => getOptionValue(option) === pending.value);
    if (index >= 0) moveHighlight(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /**
   * A parent closing a controlled popup skips `setOpen`, so with the search
   * in the trigger the query it would have cleared is cleared here, and the
   * input goes back to showing the picked label.
   */
  const wasOpen = useRef(open);
  useEffect(() => {
    const closed = wasOpen.current && !open;
    wasOpen.current = open;
    if (closed && inTrigger) setQueryState("");
  }, [open, inTrigger, setQueryState]);

  /** Keep the highlighted row in view without scrolling the page. */
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const element = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex]);

  /* -------------------------------------------------------------- lifecycle */

  /**
   * Opening moves focus to the search box, so typing goes straight to it.
   * With the search in the trigger, focus is normally there already.
   */
  useEffect(() => {
    if (!open || !searchable) return;
    const search = searchRef.current;
    if (search && search !== search.ownerDocument.activeElement) search.focus();
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
      if (disabled || isComposing(event)) return;

      if (!open) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpenState(true);
          /**
           * Landing on the first option is what `autoHighlight` would do
           * anyway, so only ArrowUp — and only when it found something —
           * counts as the user moving the highlight. Otherwise opening on a
           * list that is still loading would switch `autoHighlight` off.
           */
          if (event.key === "ArrowUp") {
            const index = lastEnabled();
            if (index >= 0) moveHighlight(index);
          } else {
            setHighlightedIndex(firstEnabled());
          }
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

  /**
   * Keyboard for the input inside the trigger
   *
   * The editable combobox of WAI-ARIA 1.2: the input keeps focus and owns
   * the caret, so Space is typed, Home and End move the caret, and only the
   * arrows, the page keys, Enter, Escape and Tab reach the list. Alt+ArrowDown
   * opens without moving the highlight and Alt+ArrowUp closes. An Escape with
   * the list already closed clears the search text.
   */
  const onTriggerInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (disabled || isComposing(event)) return;

      /** Only when there is nothing to delete in the input itself. */
      if (event.key === "Backspace") {
        if (multiple && !query && values.length) {
          event.preventDefault();
          remove(values[values.length - 1]!);
        }
        return;
      }

      if (!open) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpenState(true);
          if (event.altKey) return;
          if (event.key === "ArrowUp") {
            const index = lastEnabled();
            if (index >= 0) moveHighlight(index);
          } else {
            setHighlightedIndex(firstEnabled());
          }
        } else if (event.key === "Escape" && query) {
          event.preventDefault();
          setQueryState("");
        }
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          if (event.altKey) setOpen(false);
          else moveHighlight(highlightedIndex < 0 ? lastEnabled() : nextEnabled(highlightedIndex, -1));
          break;
        case "ArrowDown":
        case "PageDown":
        case "PageUp":
        case "Enter":
        case "Tab":
          onKeyDown(event);
          break;
        case "Escape":
          event.preventDefault();
          setOpen(false);
          break;
      }
    },
    [
      disabled, open, multiple, query, values, highlightedIndex,
      firstEnabled, lastEnabled, nextEnabled, setOpen, setOpenState, setQueryState, remove, moveHighlight, onKeyDown,
    ],
  );

  /** Whether the press that focused the input should select the label, so typing replaces it. */
  const selectOnPress = useRef(false);

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
      "data-invalid": invalid || undefined,
      "data-empty": values.length === 0 || undefined,
      onBlur: onBlurCapture,
    }),
    [open, disabled, invalid, values.length, onBlurCapture],
  );

  /** The picked option's label, which the input inside the trigger shows in single mode. */
  const selectedLabel = useMemo(() => {
    if (multiple || values.length === 0) return "";
    const option = findOption(values[0]!);
    return option === undefined ? String(values[0]) : getOptionLabel(option);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiple, values, selected]);
  const inputValue = inTrigger && !multiple && !open && query === "" ? selectedLabel : query;

  /** The field around the input: a press anywhere on it that is not on the input puts focus in the input. */
  const getFieldProps = useCallback(
    () => ({
      ref: triggerRef,
      "data-search-in": "trigger" as const,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-invalid": invalid || undefined,
      "data-empty": values.length === 0 || undefined,
      onMouseDown: (event: { target: EventTarget | null; preventDefault: () => void }) => {
        const input = searchRef.current;
        if (disabled || !input || event.target === input) return;
        event.preventDefault();
        input.focus();
      },
    }),
    [open, disabled, invalid, values.length],
  );

  const getTriggerProps = useCallback(
    (): Record<string, unknown> => inTrigger ? getFieldProps() : ({
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
      /**
       * On the combobox only: it holds the value and is what focus returns
       * to. The search box is a transient filter whose text is not the value,
       * so marking it would report the filter itself as wrong.
       */
      "aria-invalid": invalid || undefined,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-invalid": invalid || undefined,
      "data-empty": values.length === 0 || undefined,
      onClick: () => (open ? setOpen(false) : setOpen(true)),
      onKeyDown,
    }),
    [inTrigger, getFieldProps, ids, disabled, invalid, open, searchable, activeDescendant, values.length, setOpen, onKeyDown],
  );

  const getTriggerInputProps = useCallback(
    () => ({
      ref: searchRef,
      id: ids.trigger,
      type: "text" as const,
      role: "combobox" as const,
      value: inputValue,
      autoComplete: "off" as const,
      spellCheck: false,
      disabled: disabled || undefined,
      "aria-expanded": open,
      "aria-controls": open ? ids.list : undefined,
      "aria-autocomplete": "list" as const,
      "aria-activedescendant": activeDescendant,
      /** The input holds the value here, so it is the element that is invalid. */
      "aria-invalid": invalid || undefined,
      onChange: (event: { target: { value: string } }) => {
        setQuery(event.target.value);
        if (!open) setOpen(true);
      },
      onKeyDown: onTriggerInputKeyDown,
      /**
       * Focus selects a shown label, so typing replaces it rather than
       * appending to it. A pointer press puts the caret back, so the
       * selection is made again when that press ends.
       */
      onFocus: (event: { target: HTMLInputElement }) => {
        selectOnPress.current = inputValue !== "" && inputValue !== query;
        if (selectOnPress.current) event.target.select();
      },
      onMouseUp: (event: { currentTarget: HTMLInputElement }) => {
        const input = event.currentTarget;
        if (selectOnPress.current && input.selectionStart === input.selectionEnd) input.select();
        selectOnPress.current = false;
      },
      /** Leaving without a pick closes the list, which also restores the label. */
      onBlur: (event: { relatedTarget: EventTarget | null }) => {
        const next = event.relatedTarget as Node | null;
        if (next && rootRef.current?.contains(next)) return;
        if (open) setOpen(false);
        else if (query) setQueryState("");
      },
    }),
    [ids, inputValue, query, disabled, open, activeDescendant, invalid, setQuery, setOpen, setQueryState, onTriggerInputKeyDown],
  );

  const getToggleProps = useCallback(
    () => ({
      type: "button" as const,
      tabIndex: -1,
      disabled: disabled || undefined,
      "aria-expanded": open,
      "aria-controls": open ? ids.list : undefined,
      "data-open": open || undefined,
      onClick: () => {
        setOpen(!open);
        searchRef.current?.focus();
      },
    }),
    [disabled, open, ids.list, setOpen],
  );

  const getPopupProps = useCallback(
    (): Record<string, unknown> =>
      inTrigger ? { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() } : {},
    [inTrigger],
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
        id: `${reactId}-option-${idFragment(value)}`,
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

  const getGroupProps = useCallback(
    (section: AutocompleteSection<TOption>) => ({
      role: "group" as const,
      "aria-labelledby": section.labelId,
    }),
    [],
  );

  const getGroupLabelProps = useCallback(
    (section: AutocompleteSection<TOption>) => ({
      id: section.labelId,
      role: "presentation" as const,
    }),
    [],
  );

  /**
   * A `listbox` may own only options and groups, so the line between two
   * sections is presentational and hidden rather than `role="separator"`:
   * screen readers announce a separator inside a listbox inconsistently, and
   * the groups already carry the boundary.
   */
  const getSeparatorProps = useCallback(
    () => ({
      role: "none" as const,
      "aria-hidden": true as const,
    }),
    [],
  );

  return {
    options: visible,
    sections,
    grouped,
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
    invalid,
    searchable,
    searchIn: inTrigger ? "trigger" : "popup",
    inputValue,
    multiple,
    /**
     * In single mode with the search in the trigger, the input shows the
     * query rather than the value while searching, so the clear control
     * steps aside until the search ends.
     */
    showClear: clearable && values.length > 0 && !disabled && !(inTrigger && !multiple && (open || query !== "")),
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
    getTriggerInputProps,
    getToggleProps,
    getPopupProps,
    getListProps,
    getOptionProps,
    getGroupProps,
    getGroupLabelProps,
    getSeparatorProps,
    getRootProps,
  };
}
