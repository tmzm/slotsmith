import type { AutocompleteComponents } from "../autocomplete/slots/types";
import type { DataTableComponents } from "../data-table/slots/types";
import type { DatePickerComponents } from "../date-picker/slots/types";
import type { FileUploaderComponents } from "../file-uploader/slots/types";

/**
 * Provider components
 *
 * Slot overrides for every component below a `SlotsmithProvider`, one map per
 * component. Each map is the one that component's own `components` prop
 * takes, so an adapter written for one works for the other unchanged.
 *
 * The imports above are types only: the provider carries the maps and never
 * loads a component. None of them reaches an optional peer either, so an app
 * that never installs the table engine still type-checks this file.
 *
 * @example
 * ```tsx
 * const components: SlotsmithComponents = {
 *   dataTable: { Checkbox, Pagination },
 *   datePicker: { Day },
 * };
 * ```
 */
export interface SlotsmithComponents {
  /** Slots for `DataTable` and `VirtualDataTable`. */
  dataTable?: Partial<DataTableComponents>;
  /** Slots for `Autocomplete` and `VirtualAutocomplete`, the data table's page-size select included. */
  autocomplete?: Partial<AutocompleteComponents>;
  /** Slots for `DatePicker`. */
  datePicker?: Partial<DatePickerComponents>;
  /** Slots for `FileUploader` and `VirtualFileUploader`. */
  fileUploader?: Partial<FileUploaderComponents>;
}

/** The name of a component in {@link SlotsmithComponents}. */
export type SlotsmithComponentName = keyof SlotsmithComponents;

/** What the context holds outside a provider, and under one that sets no components. */
export const NO_COMPONENTS: SlotsmithComponents = {};

/**
 * Without undefined
 *
 * Drops `undefined` entries, so `{ Row: undefined }` keeps the layer below
 * instead of erasing it.
 *
 * @typeParam O - The object type.
 * @param object - The overrides, or nothing.
 * @returns The defined entries.
 */
export const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;

/**
 * Merge components
 *
 * Lays a provider's components over the outer provider's: component by
 * component, then slot by slot. A component the inner provider does not name
 * keeps the outer map itself, not a copy, so its identity survives.
 *
 * @param outer - The outer provider's merged components.
 * @param inner - The inner provider's `components` prop.
 * @returns The merged components; `outer` itself when `inner` adds nothing,
 * and `inner` itself when there is no outer provider to merge with.
 */
export function mergeComponents(outer: SlotsmithComponents, inner: SlotsmithComponents | undefined): SlotsmithComponents {
  if (!inner) return outer;
  if (outer === NO_COMPONENTS) return inner;
  const merged: Record<string, object> = { ...outer };
  let changed = false;
  for (const [name, slots] of Object.entries(inner) as [SlotsmithComponentName, object | undefined][]) {
    if (!slots) continue;
    const below = outer[name];
    merged[name] = below ? { ...below, ...withoutUndefined(slots) } : slots;
    changed = true;
  }
  return changed ? (merged as SlotsmithComponents) : outer;
}
