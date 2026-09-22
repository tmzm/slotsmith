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

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface UseDataTableOptions<T extends RowData> {
  data: T[];
  columns: DataTableColumnDef<T>[];
  /** Stable row identity. Defaults to `row.id`, falling back to the row index. */
  getRowId?: (row: T, index: number, parent?: DataTableRow<T>) => string;

  /* Sorting — controlled when `sorting` is passed, otherwise internal. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  defaultSorting?: SortingState;
  /** Data arrives already sorted (server-side sorting). */
  manualSorting?: boolean;
  enableMultiSort?: boolean;

  /* Pagination — controlled when `pagination` is passed, otherwise internal. */
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  defaultPagination?: PaginationState;
  /** Data is already one page (server-side pagination); pass `rowCount`. */
  manualPagination?: boolean;
  /** Total rows across all pages, for manual pagination. */
  rowCount?: number;
  pageSizeOptions?: number[];
  /** `false` renders every row and hides the pagination. Defaults to `true`. */
  enablePagination?: boolean;

  /* Selection — shows a checkbox column when set. */
  enableRowSelection?: boolean | ((row: DataTableRow<T>) => boolean);
  selection?: T[];
  onSelectionChange?: (selection: T[]) => void;
  defaultSelection?: T[];
  /** Clear the selection whenever the page or page size changes. */
  resetSelectionOnPageChange?: boolean;

  /* Expanding / tree data */
  getSubRows?: (row: T, index: number) => readonly T[] | undefined;
  getRowCanExpand?: (row: DataTableRow<T>) => boolean;
  expanded?: ExpandedState;
  onExpandedChange?: (expanded: ExpandedState) => void;
  defaultExpanded?: ExpandedState;
  /** Count sub-rows towards the page size. Defaults to `false`. */
  paginateExpandedRows?: boolean;

  /* Status */
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Escape hatch: extra options passed straight to TanStack's `useTable`. */
  tableOptions?: Partial<TableOptions<DataTableFeatures, T>>;
}

export type DataTableStatus = "loading" | "error" | "empty" | "ready";

export interface DataTableModel<T extends RowData> {
  table: DataTableInstance<T>;
  status: DataTableStatus;
  error: unknown;
  onRetry?: () => void;
  selectable: boolean;
  expandable: boolean;
  paginationEnabled: boolean;
  pageSizeOptions: number[];
  selection: T[];
  /** The identity key of any row, including ones on other pages. */
  getRowKey: (row: T) => string;
}

const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };

export function defaultGetRowId<T>(row: T, index: number, parent?: { id: string }): string {
  const id = (row as { id?: unknown } | null)?.id;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return parent ? `${parent.id}.${index}` : String(index);
}

/** Internal state that yields to a controlled value when one is passed. */
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

/** The headless data table: state, TanStack instance and derived status. No UI. */
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

  // Selection is exposed as rows (T[]) but TanStack works with ids. Rows seen in
  // `data` resolve to their table id by identity; anything else by `getRowId`.
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

  // A page that comes back empty (e.g. its last row was deleted) steps back.
  useEffect(() => {
    if (!enablePagination || loading || hasError || visibleRowCount > 0) return;
    const target = stepBackPageIndex(pagination.pageIndex, pageCount);
    if (target !== null && target !== pagination.pageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: target }));
    }
  }, [enablePagination, loading, hasError, visibleRowCount, pagination.pageIndex, pageCount, setPagination]);

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
