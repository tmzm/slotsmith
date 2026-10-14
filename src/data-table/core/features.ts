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
  type AccessorFn,
  type AccessorFnColumnDef,
  type AccessorKeyColumnDef,
  type Cell,
  type CellData,
  type ColumnDef,
  type ColumnHelper,
  type DeepKeys,
  type DeepValue,
  type DisplayColumnDef,
  type Header,
  type IdentifiedColumnDef,
  type ReactTable,
  type Row,
  type RowData,
} from "@tanstack/react-table";
import type { DataTableColumnEditInput } from "./spreadsheet/types";

/**
 * Column meta
 *
 * Extra per-column options read by the default renderer, set through a
 * column's `meta` field.
 *
 * @property align - Text alignment of the header and cells. Logical, so it flips in RTL.
 * @property headerClassName - Class added to this column's header cell.
 * @property cellClassName - Class added to each of this column's body cells.
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
> &
  DataTableColumnEditField<T, TValue>;

/** Whether a type is `any`. */
type IsAnyType<V> = 0 extends 1 & V ? true : false;

/**
 * Column edit field
 *
 * The `edit` field of a column, typed by the column's value. With the value
 * type left open (`DataTableColumnDef<T>`), an `accessorKey` column reads it
 * from the field the key names, so a plain array of columns is typed per
 * column. A column whose key is only known as a `string` cannot be edited
 * that way, and an `accessorFn` column's `edit` is untyped: build either with
 * {@link createDataTableColumnHelper}, or give `DataTableColumnDef<T, TValue>`
 * its value type.
 *
 * @typeParam T - The row data type.
 * @typeParam TValue - The column's value type.
 */
export type DataTableColumnEditField<T extends RowData, TValue> =
  IsAnyType<TValue> extends true
    ?
        | { [K in DeepKeys<T>]: { accessorKey: K; edit?: DataTableColumnEditInput<T, DeepValue<T, K>> } }[DeepKeys<T>]
        | { accessorKey: (string & {}) | keyof T; edit?: never }
        | { accessorKey?: undefined; edit?: DataTableColumnEditInput<T, any> }
    : { edit?: DataTableColumnEditInput<T, TValue> };

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
 * Column helper
 *
 * TanStack's column helper bound to the data table's features, whose
 * `accessor` also takes the column's `edit`, typed by the value it reads.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableColumnHelper<T extends RowData>
  extends Omit<ColumnHelper<DataTableFeatures, T>, "accessor"> {
  accessor: <
    TAccessor extends AccessorFn<T> | DeepKeys<T>,
    TValue extends TAccessor extends AccessorFn<T, infer TReturn>
      ? TReturn
      : TAccessor extends DeepKeys<T>
        ? DeepValue<T, TAccessor>
        : never,
  >(
    accessor: TAccessor,
    column: (TAccessor extends AccessorFn<T>
      ? DisplayColumnDef<DataTableFeatures, T, TValue>
      : IdentifiedColumnDef<DataTableFeatures, T, TValue>) & { edit?: DataTableColumnEditInput<T, TValue> },
  ) => TAccessor extends AccessorFn<T>
    ? AccessorFnColumnDef<DataTableFeatures, T, TValue> & {
        accessorKey?: undefined;
        edit?: DataTableColumnEditInput<T, TValue>;
      }
    : AccessorKeyColumnDef<DataTableFeatures, T, TValue> & {
        accessorKey: TAccessor;
        edit?: DataTableColumnEditInput<T, TValue>;
      };
}

/**
 * Create column helper
 *
 * A typed TanStack column helper bound to the data table's features. Its
 * `accessor` infers each column's value type, which types the column's
 * `cell` and its `edit`.
 *
 * @typeParam T - The row data type.
 * @returns A column helper for `T`.
 *
 * @example
 * ```tsx
 * const column = createDataTableColumnHelper<User>();
 * const columns = [
 *   column.accessor("name", { header: "Name", edit: true }),
 *   column.accessor("age", { header: "Age", edit: { validate: (age) => (age < 0 ? "Too low" : null) } }),
 * ];
 * ```
 */
export const createDataTableColumnHelper = <T extends RowData>(): DataTableColumnHelper<T> =>
  createColumnHelper<DataTableFeatures, T>() as unknown as DataTableColumnHelper<T>;
