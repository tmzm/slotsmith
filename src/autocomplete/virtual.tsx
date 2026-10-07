"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AutocompleteProvider,
  AutocompleteRoot,
  splitAutocompleteProps,
  splitRootProps,
  type AutocompleteProps,
  type AutocompleteRootProps,
} from "./Autocomplete";
import {
  AutocompleteGroupLabelView,
  AutocompleteGroupView,
  AutocompleteLiveRegion,
  AutocompleteOptionView,
  AutocompleteSearch,
  AutocompleteSeparatorView,
  AutocompleteStatusRows,
  AutocompleteTrigger,
  mergeProps,
  mergeRefs,
  sectionKey,
} from "./parts";
import { useAutocompleteContext } from "./slots/context";

/**
 * Virtual options
 *
 * How the windowed list measures and renders rows.
 *
 * @example
 * ```tsx
 * <VirtualAutocomplete virtual={{ estimateSize: 32, overscan: 6, maxHeight: 400 }} options={cities} />
 * ```
 */
export interface AutocompleteVirtualOptions {
  /** Estimated row height in pixels. Defaults to 36. */
  estimateSize?: number;
  /** Rows rendered beyond the visible area. Defaults to 8. */
  overscan?: number;
  /** Height of the scroll area in pixels. Defaults to 320. */
  maxHeight?: number;
  /** Height of a group's label row in pixels, with `getOptionGroup`. Defaults to 28. */
  groupLabelSize?: number;
  /** Height of the separator between sections in pixels, margins included. Defaults to 9. */
  separatorSize?: number;
}

/**
 * Virtual row
 *
 * One windowed row of a grouped list. Group labels and separators are rows
 * of their own, so the scroll height counts them; only option rows can be
 * highlighted.
 */
type VirtualRow =
  | { kind: "option"; index: number; section: number }
  | { kind: "label"; section: number }
  | { kind: "separator"; section: number };

/** Height of the scroll area when `virtual.maxHeight` is not set. */
const DEFAULT_MAX_HEIGHT = 320;

/**
 * Spacer
 *
 * An empty row standing in for the options outside the viewport, so the
 * scrollbar reflects the whole list. It is hidden from assistive technology
 * because it is not an option.
 *
 * @param props - The height to occupy.
 */
function Spacer({ height }: { height: number }) {
  if (height <= 0) return null;
  return <li aria-hidden="true" data-slot="virtual-spacer" style={{ height, padding: 0, margin: 0 }} />;
}

/**
 * Autocomplete virtual list
 *
 * A `role="listbox"` that renders only the options in view. Spacer rows keep
 * the scroll height honest, so every `Option` and `OptionLabel` part works
 * exactly as it does in the plain list.
 *
 * With `getOptionGroup`, each group's label and the separators between
 * sections are windowed rows too, sized by `groupLabelSize` and
 * `separatorSize`. The rows in view are wrapped in their `Group`, and a group
 * whose label has scrolled away keeps a hidden copy of it, so it stays named.
 *
 * Use it in place of `Autocomplete.List` when a list runs to thousands of
 * options. Paging with `hasMore` solves a different problem — how much has
 * been fetched — and the two compose.
 *
 * Requires the optional peer `@tanstack/react-virtual`.
 *
 * @param props - See {@link AutocompleteVirtualOptions}.
 *
 * @example
 * ```tsx
 * import { AutocompleteVirtualList } from "slotsmith/virtual";
 *
 * <Autocomplete.Provider options={cities} value={city} onChange={setCity}>
 *   <Autocomplete.Root>
 *     <Autocomplete.Trigger />
 *     <Autocomplete.Popup />
 *   </Autocomplete.Root>
 * </Autocomplete.Provider>
 * ```
 */
export function AutocompleteVirtualList({
  estimateSize = 36,
  overscan = 8,
  maxHeight = DEFAULT_MAX_HEIGHT,
  groupLabelSize = 28,
  separatorSize = 9,
}: AutocompleteVirtualOptions = {}) {
  const {
    components: C,
    labels,
    slotProps,
    options,
    sections,
    grouped,
    highlightedIndex,
    getOptionValue,
    status,
    canCreate,
    create,
    createLoading,
    query,
    hasMore,
    loadMore,
    loadingMore,
    listRef,
    sentinelRef,
    getListProps,
  } = useAutocompleteContext();

  /**
   * The scroll element is kept in state, not a ref: the rows render inside it,
   * so a ref object is still empty on the first pass and nothing would be
   * measured until a second render.
   */
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  /** The grouped list as rows, and the row each option sits on. `null` without groups. */
  const layout = useMemo(() => {
    if (!grouped) return null;
    const rows: VirtualRow[] = [];
    const rowOfOption: number[] = [];
    sections.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) rows.push({ kind: "separator", section: sectionIndex });
      if (section.group !== undefined) rows.push({ kind: "label", section: sectionIndex });
      section.options.forEach((_, offset) => {
        rowOfOption.push(rows.length);
        rows.push({ kind: "option", index: section.start + offset, section: sectionIndex });
      });
    });
    return { rows, rowOfOption };
  }, [grouped, sections]);

  /** Keys follow what a row shows, so a row's measured size never sticks to another row. */
  const getItemKey = useCallback(
    (index: number) => {
      const row = layout?.rows[index];
      if (!row) return index;
      const key = sectionKey(sections[row.section]!);
      if (row.kind === "option") return `option:${String(getOptionValue(options[row.index]))}`;
      return `${row.kind}:${key}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout],
  );

  const virtualizer = useVirtualizer({
    count: status === "ready" ? (layout ? layout.rows.length : options.length) : 0,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => {
      const kind = layout?.rows[index]?.kind;
      return kind === "label" ? groupLabelSize : kind === "separator" ? separatorSize : estimateSize;
    },
    overscan,
    /** Renders a first screen before the popup has been measured. */
    initialRect: { width: 0, height: maxHeight },
    ...(layout ? { getItemKey } : {}),
  });

  /**
   * The option the pointer last moved over. A highlight that came from the
   * pointer is already on screen, so it never scrolls the list.
   */
  const hovered = useRef(-1);
  const onPointerMove = useCallback((event: { target: EventTarget | null }) => {
    const row = (event.target as Element | null)?.closest?.("[data-index]");
    hovered.current = row ? Number(row.getAttribute("data-index")) : -1;
  }, []);

  /**
   * Keep the highlighted option in view. Only the rows in the window exist in
   * the DOM, so a jump past it — End, PageDown, typeahead — is scrolled to by
   * the virtualizer, which knows every row's offset, labels and separators
   * included.
   *
   * It runs when the highlighted option changes, keyed on its value, and not
   * when the rows around it do: a page arriving rebuilds the layout, and
   * scrolling back to an unmoved highlight then would undo the scroll that
   * asked for the page.
   */
  const highlightedOption = status === "ready" && highlightedIndex >= 0 ? options[highlightedIndex] : undefined;
  const highlightedKey = highlightedOption === undefined ? undefined : getOptionValue(highlightedOption);
  useEffect(() => {
    if (highlightedKey === undefined) return;
    if (hovered.current === highlightedIndex) return;
    hovered.current = -1;
    const row = layout ? layout.rowOfOption[highlightedIndex] : highlightedIndex;
    if (row === undefined) return;
    /**
     * Reaching a group's first option from below brings its label into view
     * with it, so Home and ArrowUp never leave a group unnamed on screen.
     */
    if (layout?.rows[row - 1]?.kind === "label") {
      const labelStart = virtualizer.measurementsCache[row - 1]?.start ?? 0;
      if (labelStart < (virtualizer.scrollOffset ?? 0)) {
        virtualizer.scrollToIndex(row - 1, { align: "start" });
        return;
      }
    }
    virtualizer.scrollToIndex(row, { align: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedKey]);

  const items = virtualizer.getVirtualItems();
  const before = items[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0);

  /**
   * The rows in view, with each run of a group's rows wrapped in its `Group`
   * and the separators between them.
   */
  const renderGrouped = (rows: VirtualRow[]) => {
    const out: ReactNode[] = [];
    let position = 0;
    while (position < items.length) {
      const row = rows[items[position]!.index]!;
      if (row.kind === "separator") {
        out.push(<AutocompleteSeparatorView key={items[position]!.key} />);
        position += 1;
        continue;
      }
      const section = sections[row.section]!;
      const run: ReactNode[] = [];
      let labelInView = false;
      while (position < items.length) {
        const item = items[position]!;
        const current = rows[item.index]!;
        if (current.kind === "separator" || current.section !== row.section) break;
        if (current.kind === "label") {
          labelInView = true;
          run.push(<AutocompleteGroupLabelView key={item.key} section={section} />);
        } else {
          run.push(<AutocompleteOptionView key={item.key} option={options[current.index]!} index={current.index} />);
        }
        position += 1;
      }
      /**
       * A label scrolled out of the window stays as a hidden copy, through
       * the same part, so the group keeps its name. `aria-labelledby` reads
       * hidden elements, and a hidden row takes no height from the spacers.
       */
      if (section.group === undefined) {
        out.push(...run);
      } else {
        out.push(
          <AutocompleteGroupView key={sectionKey(section)} section={section}>
            {labelInView ? null : <AutocompleteGroupLabelView section={section} hidden />}
            {run}
          </AutocompleteGroupView>,
        );
      }
    }
    return out;
  };

  return (
    <C.List
      {...mergeProps(mergeProps(getListProps(), slotProps.list), {
        ref: mergeRefs(listRef as never, setScrollElement),
        style: { maxHeight, overflowY: "auto" as const },
        onPointerMove,
      })}
    >
      {status === "ready" ? (
        <>
          <Spacer height={before} />
          {layout
            ? renderGrouped(layout.rows)
            : items.map((item) => (
                <AutocompleteOptionView key={item.key} option={options[item.index]!} index={item.index} />
              ))}
          <Spacer height={after} />
        </>
      ) : canCreate ? null : (
        <AutocompleteStatusRows />
      )}

      {canCreate ? (
        <C.Create
          query={query.trim()}
          label={createLoading ? labels.creating : labels.create(query.trim())}
          loading={createLoading}
          onCreate={create}
        />
      ) : null}

      {hasMore && status !== "error" ? (
        <C.LoadMore
          ref={sentinelRef as never}
          onLoadMore={loadMore}
          loading={loadingMore}
          label={loadingMore ? labels.loading : labels.loadMore}
        />
      ) : null}
    </C.List>
  );
}

/**
 * Virtual autocomplete props
 *
 * The `<Autocomplete>` props plus the windowing options.
 *
 * @typeParam TOption - The option type.
 */
export type VirtualAutocompleteProps<TOption> = AutocompleteProps<TOption> & {
  /** How rows are measured and rendered. */
  virtual?: AutocompleteVirtualOptions;
};

/**
 * Virtual popup
 *
 * The popup with the windowed list inside it.
 *
 * @param props - See {@link AutocompleteVirtualOptions}.
 */
function VirtualPopup(props: AutocompleteVirtualOptions) {
  const { components: C, slotProps, open, position, getPopupProps } = useAutocompleteContext();
  if (!open) return null;

  return (
    <C.Popup
      {...mergeProps(mergeProps({ ...getPopupProps(), style: position.style, "data-placement": position.placement }, slotProps.popup), {
        ref: position.setPopup,
      })}
    >
      <AutocompleteSearch />
      <AutocompleteVirtualList {...props} />
    </C.Popup>
  );
}

/**
 * VirtualAutocomplete
 *
 * `<Autocomplete>` for very long option lists: only the rows in view are
 * rendered. Everything else — the keyboard path, selection, search, paging,
 * every slot — behaves identically.
 *
 * Requires the optional peer `@tanstack/react-virtual`.
 *
 * @typeParam TOption - The option type.
 * @param props - See {@link VirtualAutocompleteProps}.
 *
 * @example
 * ```tsx
 * import { VirtualAutocomplete } from "slotsmith/virtual";
 *
 * <VirtualAutocomplete<City>
 *   options={cities}
 *   value={cityId}
 *   onChange={setCityId}
 *   virtual={{ estimateSize: 32, maxHeight: 400 }}
 * />;
 * ```
 */
export function VirtualAutocomplete<TOption>(props: VirtualAutocompleteProps<TOption>) {
  const { providerProps, rest } = splitAutocompleteProps<TOption, VirtualAutocompleteProps<TOption>>(props);
  const { virtual = {}, ...domProps } = rest;
  /** The same routing the default layout uses, so `aria-label` names the combobox. */
  const { triggerProps, rootProps } = splitRootProps(domProps as Record<string, unknown>);

  return (
    <AutocompleteProvider<TOption> {...providerProps}>
      <AutocompleteRoot {...(rootProps as AutocompleteRootProps)}>
        <AutocompleteTrigger {...triggerProps} />
        <VirtualPopup {...virtual} />
        <AutocompleteLiveRegion />
      </AutocompleteRoot>
    </AutocompleteProvider>
  );
}
