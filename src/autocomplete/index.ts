/**
 * Autocomplete
 *
 * A combobox that is also a select. Search, filter, single or multiple
 * selection, remote options with paging, and a create-as-you-type row — with
 * every part replaceable and none of it required to get started.
 *
 * @example
 * ```tsx
 * import { Autocomplete } from "slotsmith";
 * import "slotsmith/styles.css";
 *
 * <Autocomplete options={countries} value={code} onChange={setCode} />;
 * ```
 */

export {
  Autocomplete,
  AutocompleteProvider,
  AutocompleteRoot,
  splitAutocompleteProps,
} from "./Autocomplete";
export type {
  AutocompleteProps,
  AutocompleteProviderProps,
  AutocompleteRootProps,
  AutocompleteSharedProps,
} from "./Autocomplete";

export {
  AutocompleteList,
  AutocompleteLiveRegion,
  AutocompleteOptions,
  AutocompleteOptionView,
  AutocompletePopup,
  AutocompleteSearch,
  AutocompleteStatusRows,
  AutocompleteTrigger,
  mergeProps as mergeAutocompleteProps,
  mergeRefs,
} from "./parts";

export { useAutocomplete } from "./core/useAutocomplete";
export type { AutocompleteModel, UseAutocompleteOptions } from "./core/useAutocomplete";

export { useAsyncOptions } from "./core/useAsyncOptions";
export type { OptionsPage, UseAsyncOptionsOptions } from "./core/useAsyncOptions";

export { usePopupPosition } from "../shared/position";
export type { PopupPlacement, PopupPosition, UsePopupPositionOptions } from "../shared/position";

export { defaultFilter, filterOptions, fold, typeaheadMatch } from "./core/filter";
export { useControllableState } from "../shared/useControllableState";

export type {
  AutocompleteStatus,
  GetOptionLabel,
  GetOptionValue,
  OptionFilter,
  OptionValue,
  ResolvedOption,
} from "./core/types";

export { useAutocompleteContext } from "./slots/context";
export type { AutocompleteContextValue } from "./slots/context";

export { autocompleteFallbacks, defaultAutocompleteLabels } from "./slots/fallbacks";
export type * from "./slots/types";
