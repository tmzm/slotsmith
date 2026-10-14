import type { RowData } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DataTable, type DataTableProps } from "./DataTable";
import {
  DataTableVirtualBody as VirtualBody,
  type DataTableVirtualBodyProps as VirtualBodyProps,
  type DataTableVirtualOptions,
} from "./virtualBody";

/**
 * Virtual options
 *
 * The sizes of a windowed data table, without the hook: `slotsmith/virtual`
 * passes `useVirtualizer` itself.
 *
 * @example
 * ```tsx
 * <VirtualDataTable virtual={{ estimateSize: 48, overscan: 5, maxHeight: "70vh" }} />
 * ```
 */
export type VirtualOptions = Omit<DataTableVirtualOptions, "use">;

/**
 * Virtual body props
 *
 * The props of the main entry's `DataTableVirtualBody`, with the hook
 * optional: it defaults to `useVirtualizer`.
 */
export type DataTableVirtualBodyProps = Omit<VirtualBodyProps, "use"> & Partial<Pick<VirtualBodyProps, "use">>;

/**
 * DataTableVirtualBody
 *
 * The windowed body with `useVirtualizer` already passed in. The main entry
 * exports the same body taking the hook as `use`.
 *
 * @param props - See {@link DataTableVirtualBodyProps}.
 *
 * @example
 * ```tsx
 * <DataTable.Table scrollRef={setScrollElement} maxHeight={600}
 *   body={<DataTableVirtualBody scrollElement={scrollElement} maxHeight={600} />} />
 * ```
 */
export function DataTableVirtualBody({ use = useVirtualizer, ...props }: DataTableVirtualBodyProps) {
  return <VirtualBody use={use} {...props} />;
}

/**
 * Virtual data table props
 *
 * The `<DataTable>` props, with `virtual` taking the sizes only.
 *
 * @typeParam T - The row data type.
 */
export interface VirtualDataTableProps<T extends RowData> extends Omit<DataTableProps<T>, "virtual"> {
  /** How rows are measured and rendered. */
  virtual?: VirtualOptions;
}

/**
 * VirtualDataTable
 *
 * `<DataTable>` with `virtual` on and `useVirtualizer` passed in: only the
 * rows in view are rendered, the header is sticky and pagination is off
 * (`enablePagination` turns it back on). The same as
 * `<DataTable virtual={{ use: useVirtualizer, ...virtual }} />`.
 *
 * @typeParam T - The row data type.
 * @param props - See {@link VirtualDataTableProps}.
 *
 * @example
 * ```tsx
 * import { VirtualDataTable } from "slotsmith/virtual";
 *
 * <VirtualDataTable<LogLine> data={lines} columns={columns} virtual={{ estimateSize: 36, maxHeight: 600 }} />;
 * ```
 */
export function VirtualDataTable<T extends RowData>({ virtual, ...props }: VirtualDataTableProps<T>) {
  return <DataTable<T> {...props} virtual={{ use: useVirtualizer, ...virtual }} />;
}
