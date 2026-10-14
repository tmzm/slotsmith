"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Autocomplete, type AutocompleteProps } from "./Autocomplete";
import {
  AutocompleteVirtualList as VirtualList,
  type AutocompleteVirtualOptions as VirtualListOptions,
} from "./virtualList";

/**
 * Virtual options
 *
 * The sizes of a windowed list, with the hook optional: `slotsmith/virtual`
 * passes `useVirtualizer` itself.
 *
 * @example
 * ```tsx
 * <VirtualAutocomplete virtual={{ estimateSize: 32, overscan: 6, maxHeight: 400 }} options={cities} />
 * ```
 */
export type AutocompleteVirtualOptions = Omit<VirtualListOptions, "use"> & Partial<Pick<VirtualListOptions, "use">>;

/**
 * Autocomplete virtual list
 *
 * The main entry's windowed list with `useVirtualizer` already passed in.
 *
 * @param props - See {@link AutocompleteVirtualOptions}.
 *
 * @example
 * ```tsx
 * import { AutocompleteVirtualList } from "slotsmith/virtual";
 *
 * <AutocompleteVirtualList estimateSize={32} />
 * ```
 */
export function AutocompleteVirtualList({ use = useVirtualizer, ...props }: AutocompleteVirtualOptions = {}) {
  return <VirtualList use={use} {...props} />;
}

/**
 * Virtual autocomplete props
 *
 * The `<Autocomplete>` props, with `virtual` taking the sizes only.
 *
 * @typeParam TOption - The option type.
 */
export type VirtualAutocompleteProps<TOption> = Omit<AutocompleteProps<TOption>, "virtual"> & {
  /** How rows are measured and rendered. */
  virtual?: AutocompleteVirtualOptions;
};

/**
 * VirtualAutocomplete
 *
 * `<Autocomplete>` with a windowed list and `useVirtualizer` passed in, for
 * thousands of options. The same as
 * `<Autocomplete virtual={{ use: useVirtualizer, ...virtual }} />`.
 *
 * @typeParam TOption - The option type.
 * @param props - See {@link VirtualAutocompleteProps}.
 *
 * @example
 * ```tsx
 * import { VirtualAutocomplete } from "slotsmith/virtual";
 *
 * <VirtualAutocomplete options={cities} value={cityId} onChange={setCityId} />;
 * ```
 */
export function VirtualAutocomplete<TOption>({ virtual, ...props }: VirtualAutocompleteProps<TOption>) {
  return <Autocomplete<TOption> {...(props as AutocompleteProps<TOption>)} virtual={{ use: useVirtualizer, ...virtual }} />;
}
