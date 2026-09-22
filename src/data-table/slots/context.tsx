import { createContext, useContext, type MouseEvent } from "react";
import type { RowData } from "@tanstack/react-table";
import type { DataTableRow } from "../core/features";
import type { DataTableModel } from "../core/useDataTable";
import type { DataTableComponents, DataTableLabels, DataTableSlotProps } from "./types";

/**
 * Data table context value
 *
 * What `<DataTable>` / `<DataTable.Provider>` share with the parts and your
 * components: the {@link DataTableModel} plus the resolved slots and labels.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableContextValue<T extends RowData> extends DataTableModel<T> {
  /** Every slot, with the fallbacks filled in. */
  components: DataTableComponents;
  /** Every label, with the defaults filled in. */
  labels: DataTableLabels;
  /** The `slotProps` option, or `{}`. */
  slotProps: DataTableSlotProps<T>;
  /** The `onRowClick` option. */
  onRowClick?: (row: DataTableRow<T>, event: MouseEvent<HTMLTableRowElement>) => void;
}

/**
 * Data table context
 *
 * The React context behind {@link useDataTableContext}.
 */
export const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

/**
 * useDataTableContext
 *
 * Reads the surrounding table: TanStack instance, status, selection, slots and
 * labels. Use it in toolbars, bulk-action bars and custom slots.
 *
 * @typeParam T - The row data type.
 * @returns See {@link DataTableContextValue}.
 * @throws When called outside `<DataTable>` or `<DataTable.Provider>`.
 *
 * @example
 * ```tsx
 * function BulkBar() {
 *   const { selection, table } = useDataTableContext<User>();
 *   if (!selection.length) return null;
 *   return <button onClick={() => table.resetRowSelection()}>Clear {selection.length}</button>;
 * }
 * ```
 */
export function useDataTableContext<T extends RowData = any>(): DataTableContextValue<T> {
  const value = useContext(DataTableContext);
  if (!value) throw new Error("useDataTableContext must be used inside <DataTable> or <DataTable.Provider>");
  return value;
}

/**
 * Data table row context
 *
 * The React context behind {@link useDataTableRow}.
 */
export const DataTableRowContext = createContext<DataTableRow<any> | null>(null);

/**
 * useDataTableRow
 *
 * Reads the row being rendered, for custom `Row` and `Cell` slots (which only
 * receive DOM props).
 *
 * @typeParam T - The row data type.
 * @returns The row, or `null` in header and status rows.
 *
 * @example
 * ```tsx
 * function SortableRow(props: RowSlotProps) {
 *   const row = useDataTableRow<Item>();
 *   const { setNodeRef, transform } = useSortable({ id: row!.id });
 *   return <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform) }} {...props} />;
 * }
 * ```
 */
export function useDataTableRow<T extends RowData = any>(): DataTableRow<T> | null {
  return useContext(DataTableRowContext) as unknown as DataTableRow<T> | null;
}
