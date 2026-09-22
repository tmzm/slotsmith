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

/**
 * Column meta
 *
 * Extra per-column options read by the default renderer, set through a
 * column's `meta` field.
 *
 * @property align - Text alignment of the header and cells. Logical, so it flips in RTL.
 * @property headerClassName - Class added to this column's header cell.
 * @property cellClassName - Class added to each of this column's body cells.
 * @property grow - In fixed layouts, let this column take the spare width.
 *
 * @example
 * ```tsx
 * const columns: DataTableColumnDef<User>[] = [
 *   { accessorKey: "salary", header: "Salary", meta: { align: "end", cellClassName: "tabular" } },
 * ];
 * ```
 */
export interface DataTableColumnMeta {
  align?: "start" | "center" | "end";
  headerClassName?: string;
  cellClassName?: string;
  grow?: boolean;
}

/**
 * Data table features
 *
 * The TanStack Table v9 feature set every data table is built with: sorting,
 * pagination, row selection and row expanding, plus their row models and the
 * built-in sort functions. `columnMeta` types `meta` as {@link DataTableColumnMeta}.
 *
 * @example
 * ```tsx
 * // Build a fully custom table on the same features.
 * const table = useTable({ features: dataTableFeatures, data, columns });
 * ```
 */
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

/**
 * Data table features type
 *
 * The type of {@link dataTableFeatures}; the first type argument of every
 * TanStack v9 type used with this table.
 */
export type DataTableFeatures = typeof dataTableFeatures;

/**
 * Column definition
 *
 * A TanStack v9 `ColumnDef` bound to the data table's features.
 *
 * @typeParam T - The row data type.
 * @typeParam TValue - The cell value type.
 *
 * @example
 * ```tsx
 * const columns: DataTableColumnDef<User>[] = [
 *   { accessorKey: "name", header: "Name" },
 *   { accessorKey: "age", header: "Age", enableSorting: false },
 * ];
 * ```
 */
export type DataTableColumnDef<T extends RowData, TValue extends CellData = any> = ColumnDef<
  DataTableFeatures,
  T,
  TValue
>;

/**
 * Row
 *
 * A TanStack v9 row of the data table. `row.original` is your data object.
 *
 * @typeParam T - The row data type.
 */
export type DataTableRow<T extends RowData> = Row<DataTableFeatures, T>;

/**
 * Cell
 *
 * A TanStack v9 cell of the data table.
 *
 * @typeParam T - The row data type.
 */
export type DataTableCell<T extends RowData> = Cell<DataTableFeatures, T, CellData>;

/**
 * Header
 *
 * A TanStack v9 header of the data table.
 *
 * @typeParam T - The row data type.
 */
export type DataTableHeader<T extends RowData> = Header<DataTableFeatures, T, CellData>;

/**
 * Table instance
 *
 * The TanStack v9 table instance returned by {@link useDataTable}.
 *
 * @typeParam T - The row data type.
 */
export type DataTableInstance<T extends RowData> = ReactTable<DataTableFeatures, T>;

/**
 * Create column helper
 *
 * A typed TanStack column helper bound to the data table's features.
 *
 * @typeParam T - The row data type.
 * @returns A column helper for `T`.
 *
 * @example
 * ```tsx
 * const column = createDataTableColumnHelper<User>();
 * const columns = [
 *   column.accessor("name", { header: "Name" }),
 *   column.accessor("age", { header: "Age", meta: { align: "end" } }),
 * ];
 * ```
 */
export const createDataTableColumnHelper = <T extends RowData>() =>
  createColumnHelper<DataTableFeatures, T>();
