/**
 * slotsmith/virtual
 *
 * Windowed renderers for the components whose lists can grow without bound.
 * They render only what is in view, keep every slot working, and are kept in
 * this separate entry so the optional peer `@tanstack/react-virtual` is only
 * pulled in by the projects that need it.
 *
 * @example
 * ```tsx
 * import { VirtualAutocomplete, VirtualDataTable } from "slotsmith/virtual";
 *
 * <VirtualDataTable data={logLines} columns={columns} virtual={{ estimateSize: 36 }} />;
 * <VirtualAutocomplete options={cities} value={cityId} onChange={setCityId} />;
 * ```
 *
 * @packageDocumentation
 */

export { DataTableVirtualBody, VirtualDataTable } from "./data-table/virtual";
export type {
  DataTableVirtualBodyProps,
  VirtualDataTableProps,
  VirtualOptions,
} from "./data-table/virtual";

export { AutocompleteVirtualList, VirtualAutocomplete } from "./autocomplete/virtual";
export type {
  AutocompleteVirtualOptions,
  VirtualAutocompleteProps,
} from "./autocomplete/virtual";
