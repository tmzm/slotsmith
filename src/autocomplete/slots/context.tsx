"use client";

import { createContext, useContext } from "react";
import type { AutocompleteModel } from "../core/useAutocomplete";
import type { PopupPosition } from "../core/position";
import type { AutocompleteComponents, AutocompleteLabels, AutocompleteSlotProps } from "./types";

/**
 * Autocomplete context value
 *
 * What `<Autocomplete>` and `<Autocomplete.Provider>` share with the compound
 * parts and with custom slots: the {@link AutocompleteModel} plus the resolved
 * parts, labels and slot props.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteContextValue<TOption = any> extends AutocompleteModel<TOption> {
  /** Every part, with the fallbacks filled in. */
  components: AutocompleteComponents<TOption>;
  /** Every label, with the defaults filled in. */
  labels: AutocompleteLabels;
  /** The `slotProps` option, or `{}`. */
  slotProps: AutocompleteSlotProps;
  /** Where the popup sits, and the refs that keep it there. */
  position: PopupPosition;
  /** The placeholder the trigger shows when nothing is selected. */
  placeholder: string;
  /** How many tags render before the rest collapse into `+N`. */
  maxTags: number;
}

/**
 * Autocomplete context
 *
 * The React context behind {@link useAutocompleteContext}.
 */
export const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

/**
 * useAutocompleteContext
 *
 * Reads the surrounding autocomplete: its options, selection, search, status,
 * parts and labels. Use it in custom layouts and in parts that need more than
 * the props their slot receives.
 *
 * @typeParam TOption - The option type.
 * @returns See {@link AutocompleteContextValue}.
 * @throws When called outside `<Autocomplete>` or `<Autocomplete.Provider>`.
 *
 * @example
 * ```tsx
 * function SelectionCount() {
 *   const { values, clear } = useAutocompleteContext();
 *   if (!values.length) return null;
 *   return <button onClick={clear}>Clear {values.length}</button>;
 * }
 * ```
 */
export function useAutocompleteContext<TOption = any>(): AutocompleteContextValue<TOption> {
  const value = useContext(AutocompleteContext);
  if (!value) {
    throw new Error("useAutocompleteContext must be used inside <Autocomplete> or <Autocomplete.Provider>");
  }
  return value as AutocompleteContextValue<TOption>;
}
