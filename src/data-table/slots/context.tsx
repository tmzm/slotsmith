import { createContext, useContext, type MouseEvent } from "react";
import type { RowData } from "@tanstack/react-table";
import type { LocaleInput } from "../../locale/types";
import type { DataTableColumnDef, DataTableRow } from "../core/features";
import type { DataTableModel } from "../core/useDataTable";
import type { SpreadsheetRenderContext } from "../spreadsheet";
import type { DataTableSlotProps } from "./slotProps";
import type { DataTableComponents, DataTableLabels } from "./types";

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
  /**
   * The `locale` option, as given. `undefined` means the provider's, so a
   * nested component handed it follows the same language as the table.
   */
  locale?: LocaleInput;
  /** The `onRowClick` option. */
  onRowClick?: (row: DataTableRow<T>, event: MouseEvent<HTMLTableRowElement>) => void;
  /**
   * What every body row renders with, as one object that stays the same
   * while none of it changes. Rows compare it to skip re-rendering.
   *
   * @internal
   */
  rowRender: DataTableRowRender<T>;
}

/**
 * Row render context
 *
 * The table-wide inputs of a body row. A row re-renders when this object,
 * its own data or its own state changes, and not otherwise.
 *
 * @typeParam T - The row data type.
 * @internal
 */
export interface DataTableRowRender<T extends RowData> {
  components: DataTableComponents;
  labels: DataTableLabels;
  slotProps: DataTableSlotProps<T>;
  selectable: boolean;
  expandable: boolean;
  reorderHandleColumn: boolean;
  /** Calls the latest `onRowClick`; `null` when there is none. */
  onRowClick: ((row: DataTableRow<T>, event: MouseEvent<HTMLTableRowElement>) => void) | null;
  /** The columns, by identity: new columns re-render every row. */
  columns: readonly DataTableColumnDef<T>[];
  /** Spreadsheet mode, when on. */
  spreadsheet: SpreadsheetRenderContext<T> | null;
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
 * Virtual table context
 *
 * `true` under `VirtualDataTable`, which tells the provider that its body is
 * virtualized. Internal: row reordering is not supported there yet.
 *
 * @internal
 */
export const VirtualTableContext = createContext(false);

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
