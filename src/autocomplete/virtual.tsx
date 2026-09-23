"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";
import {
  AutocompleteProvider,
  AutocompleteRoot,
  splitAutocompleteProps,
  type AutocompleteProps,
  type AutocompleteRootProps,
} from "./Autocomplete";
import {
  AutocompleteLiveRegion,
  AutocompleteOptionView,
  AutocompleteSearch,
  AutocompleteStatusRows,
  AutocompleteTrigger,
  mergeProps,
  mergeRefs,
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
}

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
}: AutocompleteVirtualOptions = {}) {
  const {
    components: C,
    labels,
    slotProps,
    options,
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

  const virtualizer = useVirtualizer({
    count: status === "ready" ? options.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    /** Renders a first screen before the popup has been measured. */
    initialRect: { width: 0, height: maxHeight },
  });

  const items = virtualizer.getVirtualItems();
  const before = items[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0);

  return (
    <C.List
      {...mergeProps(mergeProps(getListProps(), slotProps.list), {
        ref: mergeRefs(listRef as never, setScrollElement),
        style: { maxHeight, overflowY: "auto" as const },
      })}
    >
      {status === "ready" ? (
        <>
          <Spacer height={before} />
          {items.map((item) => (
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
  const { components: C, slotProps, open, position } = useAutocompleteContext();
  if (!open) return null;

  return (
    <C.Popup
      {...mergeProps(mergeProps({ style: position.style, "data-placement": position.placement }, slotProps.popup), {
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
  const { virtual = {}, ...rootProps } = rest;

  return (
    <AutocompleteProvider<TOption> {...providerProps}>
      <AutocompleteRoot {...(rootProps as AutocompleteRootProps)}>
        <AutocompleteTrigger />
        <VirtualPopup {...virtual} />
        <AutocompleteLiveRegion />
      </AutocompleteRoot>
    </AutocompleteProvider>
  );
}
