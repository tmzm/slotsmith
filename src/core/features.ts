import {
  createColumnHelper,
  createExpandedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type Cell,
  type CellData,
  type ColumnDef,
  type Header,
  type ReactTable,
  type Row,
  type RowData,
} from "@tanstack/react-table";

/** Extra per-column options read by the default renderer. */
export interface DataTableColumnMeta {
  /** Text alignment of the header and cells (logical, so it flips in RTL). */
  align?: "start" | "center" | "end";
  /** Class added to this column's header cell. */
  headerClassName?: string;
  /** Class added to each of this column's body cells. */
  cellClassName?: string;
  /** In fixed layouts (virtual mode), let this column take the spare width. */
  grow?: boolean;
}

/** The TanStack Table v9 feature set every data table is built with. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowExpandingFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumnDef<T extends RowData, TValue extends CellData = any> = ColumnDef<
  DataTableFeatures,
  T,
  TValue
>;
export type DataTableRow<T extends RowData> = Row<DataTableFeatures, T>;
export type DataTableCell<T extends RowData> = Cell<DataTableFeatures, T, CellData>;
export type DataTableHeader<T extends RowData> = Header<DataTableFeatures, T, CellData>;
export type DataTableInstance<T extends RowData> = ReactTable<DataTableFeatures, T>;

/** Typed column helper bound to the data table's feature set. */
export const createDataTableColumnHelper = <T extends RowData>() =>
  createColumnHelper<DataTableFeatures, T>();
