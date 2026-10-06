import type { RowData } from "@tanstack/react-table";
import type { DataTableCell, DataTableHeader, DataTableRow } from "../core/features";
import type {
  CellSlotProps,
  DragHandleSlotProps,
  HeaderCellSlotProps,
  RowSlotProps,
  SectionSlotProps,
  TableSlotProps,
} from "./types";

/**
 * Data table slot props
 *
 * Extra DOM props merged into element slots: classNames are joined, styles
 * merged, `onClick` handlers chained, and anything else overrides.
 *
 * It lives apart from `./types` because it is the one slot type that names
 * the table engine's rows and cells. `./types` therefore needs no optional
 * peer, and the provider and the locale types can import it in an app that
 * never installs the table.
 *
 * @typeParam T - The row data type.
 *
 * @example
 * ```tsx
 * <DataTable
 *   slotProps={{
 *     row: (row) => ({ className: row.original.archived ? "opacity-50" : undefined }),
 *     cell: (cell) => ({ title: String(cell.getValue()) }),
 *   }}
 * />
 * ```
 */
export interface DataTableSlotProps<T extends RowData> {
  /** Props for the `Table` slot. */
  table?: TableSlotProps;
  /** Props for the `Head` slot. */
  head?: SectionSlotProps;
  /** Props for the `Body` slot. */
  body?: SectionSlotProps;
  /** Props for every `HeaderRow`. */
  headerRow?: RowSlotProps;
  /** Props for each column's `HeaderCell`. */
  headerCell?: (header: DataTableHeader<T>) => HeaderCellSlotProps | undefined;
  /** Props for the `Foot` slot. */
  foot?: SectionSlotProps;
  /** Props for every `FooterRow`. */
  footerRow?: RowSlotProps;
  /** Props for each column's `FooterCell`. */
  footerCell?: (header: DataTableHeader<T>) => CellSlotProps | undefined;
  /** Props for each body `Row`. */
  row?: (row: DataTableRow<T>) => RowSlotProps | undefined;
  /** Props for each body `Cell`. */
  cell?: (cell: DataTableCell<T>) => CellSlotProps | undefined;
  /** Props for each row's `DragHandle`, when `enableRowReorder` is on. */
  dragHandle?: (row: DataTableRow<T>) => DragHandleSlotProps | undefined;
}
