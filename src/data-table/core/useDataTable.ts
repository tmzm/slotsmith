import {
  functionalUpdate,
  useTable,
  type ExpandedState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type Updater,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dataTableFeatures,
  type DataTableColumnDef,
  type DataTableFeatures,
  type DataTableInstance,
  type DataTableRow,
} from "./features";
import { fromRowSelection, stepBackPageIndex, toRowSelection } from "./selection";

/**
 * Default page size options
 *
 * The page sizes offered by the page-size select unless `pageSizeOptions` is passed.
 */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Data table options
 *
 * Everything that drives the table's data and state. Each piece of state
 * (sorting, pagination, selection, expansion) is controlled when its value is
 * passed and managed internally otherwise; `default*` sets the internal start value.
 *
 * @typeParam T - The row data type.
 *
 * @example
 * ```tsx
 * const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
 *
 * useDataTable<User>({
 *   data: page.rows,
 *   columns,
 *   manualPagination: true,
 *   rowCount: page.total,
 *   pagination,
 *   onPaginationChange: setPagination,
 * });
 * ```
 */
export interface UseDataTableOptions<T extends RowData> {
  /** The rows to display. For manual pagination, just the current page. */
  data: T[];
  /** The column definitions. */
  columns: DataTableColumnDef<T>[];
  /** Stable row identity. Defaults to `row.id`, falling back to the row's index path. */
  getRowId?: (row: T, index: number, parent?: DataTableRow<T>) => string;

  /** Controlled sorting state. */
  sorting?: SortingState;
  /** Called with the new sorting state. */
  onSortingChange?: (sorting: SortingState) => void;
  /** Initial sorting when uncontrolled. Defaults to `[]`. */
  defaultSorting?: SortingState;
  /** The data arrives already sorted (server-side sorting). Defaults to `false`. */
  manualSorting?: boolean;
  /** Allow sorting by several columns with shift-click. Defaults to `false`. */
  enableMultiSort?: boolean;

  /** Controlled pagination state. */
  pagination?: PaginationState;
  /** Called with the new pagination state. */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Initial pagination when uncontrolled. Defaults to `{ pageIndex: 0, pageSize: 10 }`. */
  defaultPagination?: PaginationState;
  /** The data is already one page (server-side pagination); pass `rowCount` too. Defaults to `false`. */
  manualPagination?: boolean;
  /** Total rows across all pages, for manual pagination. */
  rowCount?: number;
  /** The page sizes offered. Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS}. */
  pageSizeOptions?: number[];
  /** `false` renders every row and hides the pagination. Defaults to `true`. */
  enablePagination?: boolean;

  /** Shows a checkbox column. A function decides per row whether it can be selected. */
  enableRowSelection?: boolean | ((row: DataTableRow<T>) => boolean);
  /** Controlled selection, as row objects. Matched to rows by `getRowId`. */
  selection?: T[];
  /** Called with the selected rows, including rows on other server pages. */
  onSelectionChange?: (selection: T[]) => void;
  /** Initial selection when uncontrolled. Defaults to `[]`. */
  defaultSelection?: T[];
  /** Clear the selection whenever the page or page size changes. Defaults to `false`. */
  resetSelectionOnPageChange?: boolean;

  /** Returns a row's children, turning the table into a tree. */
  getSubRows?: (row: T, index: number) => readonly T[] | undefined;
  /** Decides whether a row can expand, e.g. to lazy-load children. */
  getRowCanExpand?: (row: DataTableRow<T>) => boolean;
  /** Controlled expansion: `true` for all rows, or `{ [rowId]: true }`. */
  expanded?: ExpandedState;
  /** Called with the new expansion state. */
  onExpandedChange?: (expanded: ExpandedState) => void;
  /** Initial expansion when uncontrolled. Defaults to `{}`. */
  defaultExpanded?: ExpandedState;
  /** Count sub-rows towards the page size. Defaults to `false`. */
  paginateExpandedRows?: boolean;

  /** Shows skeleton rows. Defaults to `false`. */
  loading?: boolean;
  /** Any non-nullish value shows the error state. */
  error?: unknown;
  /** Shows a retry button in the error state. */
  onRetry?: () => void;

  /** Escape hatch: extra options passed straight to TanStack's `useTable`. */
  tableOptions?: Partial<TableOptions<DataTableFeatures, T>>;
}

/**
 * Data table status
 *
 * What the body shows: skeleton rows, the error, the empty message, or rows.
 */
export type DataTableStatus = "loading" | "error" | "empty" | "ready";

/**
 * Data table model
 *
 * The result of {@link useDataTable}: the TanStack instance plus the derived
 * state every renderer needs.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableModel<T extends RowData> {
  /** The TanStack v9 table instance. */
  table: DataTableInstance<T>;
  /** What the body should show. */
  status: DataTableStatus;
  /** The `error` option, as passed. */
  error: unknown;
  /** The `onRetry` option, as passed. */
  onRetry?: () => void;
  /** Whether the checkbox column is shown. */
  selectable: boolean;
  /** Whether rows can expand (`getSubRows` or `getRowCanExpand` was passed). */
  expandable: boolean;
  /** Whether rows are paginated. */
  paginationEnabled: boolean;
  /** The page sizes offered. */
  pageSizeOptions: number[];
  /** The selected rows, including rows on other server pages. */
  selection: T[];
  /** Returns the identity key of any row, including rows on other pages. */
  getRowKey: (row: T) => string;
}

const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };

/**
 * Default row id
 *
 * Uses `row.id` when it is a string or number, otherwise the row's index path
 * (`"3"`, `"3.0"` for its first child).
 *
 * @param row - The row data.
 * @param index - The row's index among its siblings.
 * @param parent - The parent row, for sub-rows.
 * @returns The row id.
 */
export function defaultGetRowId<T>(row: T, index: number, parent?: { id: string }): string {
  const id = (row as { id?: unknown } | null)?.id;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return parent ? `${parent.id}.${index}` : String(index);
}

/**
 * Controllable state
 *
 * Internal state that yields to a controlled value when one is passed, and
 * always reports changes through `onChange`.
 *
 * @param value - The controlled value, or `undefined` to use internal state.
 * @param defaultValue - The internal start value.
 * @param onChange - Called with every new value.
 * @returns The current value and a setter that accepts a value or an updater.
 */
function useControllableState<S>(
  value: S | undefined,
  defaultValue: S,
  onChange?: (next: S) => void,
): [S, (updater: Updater<S>) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const latest = useRef(current);
  latest.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const set = useCallback(
    (updater: Updater<S>) => {
      const next = functionalUpdate(updater, latest.current);
      latest.current = next;
      if (!controlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );

  return [current, set];
}

const isPresent = (error: unknown) => error !== undefined && error !== null && error !== false;

/**
 * useDataTable
 *
 * The headless data table: state, the TanStack v9 instance and the derived
 * status, with no UI. Use it to render a table entirely your own way, or use
 * `<DataTable>` which calls it for you.
 *
 * @typeParam T - The row data type.
 * @param options - See {@link UseDataTableOptions}.
 * @returns See {@link DataTableModel}.
 *
 * @example
 * ```tsx
 * function Users({ users }: { users: User[] }) {
 *   const { table, status } = useDataTable({ data: users, columns });
 *   if (status === "empty") return <p>No users</p>;
 *   return (
 *     <ul>
 *       {table.getRowModel().rows.map((row) => (
 *         <li key={row.id}>{row.original.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDataTable<T extends RowData>(options: UseDataTableOptions<T>): DataTableModel<T> {
  const {
    data,
    columns,
    getRowId = defaultGetRowId,
    manualSorting = false,
    enableMultiSort = false,
    manualPagination = false,
    rowCount,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    enablePagination = true,
    enableRowSelection,
    resetSelectionOnPageChange = false,
    getSubRows,
    getRowCanExpand,
    paginateExpandedRows = false,
    loading = false,
    error,
    onRetry,
    tableOptions,
  } = options;

  const [sorting, setSorting] = useControllableState(
    options.sorting,
    options.defaultSorting ?? [],
    options.onSortingChange,
  );
  const [pagination, setPagination] = useControllableState(
    options.pagination,
    options.defaultPagination ?? DEFAULT_PAGINATION,
    options.onPaginationChange,
  );
  const [selection, setSelection] = useControllableState(
    options.selection,
    options.defaultSelection ?? [],
    options.onSelectionChange,
  );
  const [expanded, setExpanded] = useControllableState<ExpandedState>(
    options.expanded,
    options.defaultExpanded ?? {},
    options.onExpandedChange,
  );

  const selectable = enableRowSelection !== undefined && enableRowSelection !== false;
  const expandable = getSubRows !== undefined || getRowCanExpand !== undefined;

  /**
   * Selection is exposed as rows (T[]) but TanStack works with ids. Rows seen
   * in `data` resolve to their table id by identity; anything else by `getRowId`.
   */
  const idByOriginal = useRef(new WeakMap<object, string>());
  const getRowKey = useCallback(
    (row: T) =>
      (typeof row === "object" && row !== null ? idByOriginal.current.get(row) : undefined) ??
      getRowId(row, -1),
    [getRowId],
  );

  const rowSelection = useMemo(() => toRowSelection(selection, getRowKey), [selection, getRowKey]);

  const table = useTable<DataTableFeatures, T>({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    getSubRows,
    getRowCanExpand,
    state: { sorting, pagination, rowSelection, expanded },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);
      setPagination(next);
      if (
        resetSelectionOnPageChange &&
        (next.pageIndex !== pagination.pageIndex || next.pageSize !== pagination.pageSize)
      ) {
        setSelection([]);
      }
    },
    onRowSelectionChange: (updater) => {
      const next: RowSelectionState = functionalUpdate(updater, rowSelection);
      const rowsById = new Map<string, T>();
      for (const row of table.getCoreRowModel().flatRows) rowsById.set(row.id, row.original);
      setSelection(fromRowSelection(next, rowsById, selection, getRowKey));
    },
    onExpandedChange: setExpanded,
    manualSorting,
    manualPagination: manualPagination || !enablePagination,
    rowCount,
    enableMultiSort,
    enableRowSelection: selectable ? enableRowSelection : false,
    sortDescFirst: false,
    paginateExpandedRows,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    ...tableOptions,
  });

  for (const row of table.getCoreRowModel().flatRows) {
    if (typeof row.original === "object" && row.original !== null) {
      idByOriginal.current.set(row.original, row.id);
    }
  }

  const visibleRowCount = table.getRowModel().rows.length;
  const hasError = isPresent(error);
  const pageCount = table.getPageCount();

  /**
   * With manual pagination, `data` still holds the previous page right after
   * the page index changes (until the parent starts loading the new one), so
   * that data must not be judged as the new page coming back empty.
   */
  const lastPageIndex = useRef(pagination.pageIndex);
  const previousPageData = useRef<T[] | null>(null);

  /** A page that comes back empty (e.g. its last row was deleted) steps back. */
  useEffect(() => {
    if (lastPageIndex.current !== pagination.pageIndex) {
      lastPageIndex.current = pagination.pageIndex;
      previousPageData.current = manualPagination ? data : null;
    }
    if (previousPageData.current === data) return;
    previousPageData.current = null;

    if (!enablePagination || loading || hasError || visibleRowCount > 0) return;
    const target = stepBackPageIndex(pagination.pageIndex, pageCount);
    if (target !== null && target !== pagination.pageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: target }));
    }
  }, [
    data,
    manualPagination,
    enablePagination,
    loading,
    hasError,
    visibleRowCount,
    pagination.pageIndex,
    pageCount,
    setPagination,
  ]);

  const status: DataTableStatus = loading
    ? "loading"
    : hasError
      ? "error"
      : visibleRowCount === 0
        ? "empty"
        : "ready";

  return {
    table,
    status,
    error,
    onRetry,
    selectable,
    expandable,
    paginationEnabled: enablePagination,
    pageSizeOptions,
    selection,
    getRowKey,
  };
}
