import { createContext, useContext, type MouseEvent } from "react";
import type { RowData } from "@tanstack/react-table";
import type { DataTableRow } from "../core/features";
import type { DataTableModel } from "../core/useDataTable";
import type { DataTableComponents, DataTableLabels, DataTableSlotProps } from "./types";

export interface DataTableContextValue<T extends RowData> extends DataTableModel<T> {
  components: DataTableComponents;
  labels: DataTableLabels;
  slotProps: DataTableSlotProps<T>;
  onRowClick?: (row: DataTableRow<T>, event: MouseEvent<HTMLTableRowElement>) => void;
}

export const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

/** Everything the table knows: TanStack instance, status, slots, labels. */
export function useDataTableContext<T extends RowData = any>(): DataTableContextValue<T> {
  const value = useContext(DataTableContext);
  if (!value) throw new Error("useDataTableContext must be used inside <DataTable> or <DataTable.Provider>");
  return value;
}

export const DataTableRowContext = createContext<DataTableRow<any> | null>(null);

/** The row being rendered — for custom `Row` / `Cell` slots. `null` in header and status rows. */
export function useDataTableRow<T extends RowData = any>(): DataTableRow<T> | null {
  return useContext(DataTableRowContext) as unknown as DataTableRow<T> | null;
}
