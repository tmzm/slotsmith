import type {
  ComponentType,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import type { RowData } from "@tanstack/react-table";
import type { DataTableCell, DataTableHeader, DataTableRow } from "../core/features";

/**
 * Sort direction
 *
 * A column's current sort: ascending, descending, or `false` when unsorted.
 */
export type SortDirection = false | "asc" | "desc";

/**
 * Root slot props
 *
 * Element slot: plain `<div>` props for the table's outer element. Carries
 * `data-status`, `data-size`, `data-striped` and `aria-busy`.
 */
export type RootSlotProps = HTMLAttributes<HTMLDivElement>;

/**
 * Table slot props
 *
 * Element slot: plain `<table>` props.
 */
export type TableSlotProps = TableHTMLAttributes<HTMLTableElement>;

/**
 * Section slot props
 *
 * Element slot: plain `<thead>` / `<tbody>` props.
 */
export type SectionSlotProps = HTMLAttributes<HTMLTableSectionElement>;

/**
 * Row slot props
 *
 * Element slot: plain `<tr>` props. Body rows carry `data-state="selected"`,
 * `data-depth`, `data-expanded` and `data-clickable`; status rows carry
 * `data-state="loading" | "empty" | "error"`. Read the row itself with
 * `useDataTableRow()`.
 *
 * @example
 * ```tsx
 * // shadcn's TableRow already styles data-[state=selected]:
 * <DataTable components={{ Row: TableRow }} />
 * ```
 */
export type RowSlotProps = HTMLAttributes<HTMLTableRowElement>;

/**
 * Header cell slot props
 *
 * Element slot: plain `<th>` props. Sortable headers carry `aria-sort` and
 * `data-sorted`; aligned columns carry `data-align`. The obsolete HTML `align`
 * attribute is left out (alignment is set through `style`), so components
 * with their own `align` prop, like MUI's `TableCell`, fit directly.
 */
export type HeaderCellSlotProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "align">;

/**
 * Cell slot props
 *
 * Element slot: plain `<td>` props. Aligned columns carry `data-align`. The
 * obsolete HTML `align` attribute is left out, as for {@link HeaderCellSlotProps}.
 */
export type CellSlotProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "align">;

/**
 * Checkbox slot props
 *
 * Widget slot for the row and select-all checkboxes.
 *
 * @example
 * ```tsx
 * // shadcn adapter
 * const Checkbox = ({ checked, indeterminate, onCheckedChange, ...props }: CheckboxSlotProps) => (
 *   <ShadcnCheckbox
 *     checked={indeterminate ? "indeterminate" : checked}
 *     onCheckedChange={(value) => onCheckedChange(value === true)}
 *     onClick={(event) => event.stopPropagation()}
 *     {...props}
 *   />
 * );
 * ```
 */
export interface CheckboxSlotProps {
  /** Whether the row (or every row on the page) is selected. */
  checked: boolean;
  /** Some, but not all, rows (or sub-rows) are selected. */
  indeterminate: boolean;
  /** The row can't be selected. */
  disabled: boolean;
  /** Call with the new checked value. */
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name, from `labels.selectRow` / `labels.selectAll`. */
  "aria-label": string;
}

/**
 * Sort trigger slot props
 *
 * Widget slot wrapping a sortable header's content. The fallback is a
 * `<button>` holding the header and the `SortIcon` slot.
 */
export interface SortTriggerSlotProps {
  /** The column's current sort direction. */
  direction: SortDirection;
  /** Toggles the sort (asc → desc → none). Pass the event so shift-click multi-sorts. */
  onClick: (event: MouseEvent<HTMLElement>) => void;
  /** The rendered header. */
  children: ReactNode;
}

/**
 * Sort icon slot props
 *
 * Widget slot for the icon inside the fallback `SortTrigger`.
 */
export interface SortIconSlotProps {
  /** The column's current sort direction. */
  direction: SortDirection;
}

/**
 * Expand toggle slot props
 *
 * Widget slot for the button that expands a tree row, shown in the first column.
 */
export interface ExpandToggleSlotProps {
  /** Whether the row is expanded. */
  expanded: boolean;
  /** The row's nesting depth; 0 for top-level rows. */
  depth: number;
  /** Expands or collapses the row. */
  onToggle: () => void;
  /** Accessible name, from `labels.expandRow` / `labels.collapseRow`. */
  "aria-label": string;
}

/**
 * Skeleton slot props
 *
 * Widget slot rendered in every cell while `loading` is true.
 */
export interface SkeletonSlotProps {
  /** Index of the skeleton row. */
  rowIndex: number;
  /** Index of the cell within the row, counting the checkbox column. */
  columnIndex: number;
}

/**
 * Empty slot props
 *
 * Widget slot rendered in a full-width cell when there are no rows.
 */
export interface EmptySlotProps {
  /** From `labels.empty`. */
  message: ReactNode;
}

/**
 * Error slot props
 *
 * Widget slot rendered in a full-width cell when `error` is set.
 */
export interface ErrorSlotProps {
  /** The `error` value, as passed. */
  error: unknown;
  /** From `labels.error`. */
  message: ReactNode;
  /** From `labels.retry`. */
  retryLabel: ReactNode;
  /** The `onRetry` option; show a retry button when present. */
  onRetry?: () => void;
}

/**
 * Pagination slot props
 *
 * Widget slot for the whole pagination bar. The fallback composes the
 * `PaginationButton` and `PageSizeSelect` slots.
 *
 * @example
 * ```tsx
 * const Pager = ({ pageIndex, pageCount, setPageIndex }: PaginationSlotProps) => (
 *   <MuiPagination page={pageIndex + 1} count={pageCount} onChange={(_, page) => setPageIndex(page - 1)} />
 * );
 * ```
 */
export interface PaginationSlotProps {
  /** Zero-based current page. */
  pageIndex: number;
  /** Total pages; at least 1, even with no rows. */
  pageCount: number;
  /** Rows per page. */
  pageSize: number;
  /** The page sizes offered, including the current one. */
  pageSizeOptions: number[];
  /** Total rows across all pages. */
  rowCount: number;
  /** Whether there's a previous page. */
  canPreviousPage: boolean;
  /** Whether there's a next page. */
  canNextPage: boolean;
  /** Goes to the previous page. */
  previousPage: () => void;
  /** Goes to the next page. */
  nextPage: () => void;
  /** Goes to a zero-based page. */
  setPageIndex: (pageIndex: number) => void;
  /** Changes the page size. */
  setPageSize: (pageSize: number) => void;
  /** The resolved labels. */
  labels: DataTableLabels;
}

/**
 * Pagination button slot props
 *
 * Widget slot for the previous / next buttons of the fallback `Pagination`.
 */
export interface PaginationButtonSlotProps {
  /** Which way the button goes. */
  direction: "previous" | "next";
  /** There's no page in that direction. */
  disabled: boolean;
  /** Goes to that page. */
  onClick: () => void;
  /** Accessible name, from `labels.previousPage` / `labels.nextPage`. */
  "aria-label": string;
}

/**
 * Page size select slot props
 *
 * Widget slot for the rows-per-page picker of the fallback `Pagination`.
 */
export interface PageSizeSelectSlotProps {
  /** The current page size. */
  value: number;
  /** The page sizes offered. */
  options: number[];
  /** Call with the chosen page size. */
  onValueChange: (pageSize: number) => void;
  /** From `labels.rowsPerPage`. */
  label: ReactNode;
}

/**
 * Data table components
 *
 * Every replaceable piece of the table. Element slots (`Root` … `Cell`) get
 * plain DOM props, so a UI library's table primitives drop straight in.
 * Widget slots get semantic props; write a small adapter for your library.
 * Anything you don't pass falls back to the built-in plain-HTML component.
 *
 * @example
 * ```tsx
 * import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
 *
 * const shadcn: Partial<DataTableComponents> = {
 *   Table, Head: TableHeader, Body: TableBody,
 *   HeaderRow: TableRow, Row: TableRow, HeaderCell: TableHead, Cell: TableCell,
 *   Checkbox: ShadcnCheckboxAdapter,
 * };
 *
 * <DataTable components={shadcn} data={data} columns={columns} />;
 * ```
 */
export interface DataTableComponents {
  /** Outer element. Fallback: `<div class="rdt">`. */
  Root: ComponentType<RootSlotProps>;
  /** Fallback: `<table class="rdt__table">`. */
  Table: ComponentType<TableSlotProps>;
  /** Fallback: `<thead>`. */
  Head: ComponentType<SectionSlotProps>;
  /** Fallback: `<tbody>`. */
  Body: ComponentType<SectionSlotProps>;
  /** Fallback: `<tr>` in the head. */
  HeaderRow: ComponentType<RowSlotProps>;
  /** Fallback: `<th>`. */
  HeaderCell: ComponentType<HeaderCellSlotProps>;
  /** Fallback: `<tr>` in the body. */
  Row: ComponentType<RowSlotProps>;
  /** Fallback: `<td>`. */
  Cell: ComponentType<CellSlotProps>;
  /** Fallback: native checkbox with indeterminate support. */
  Checkbox: ComponentType<CheckboxSlotProps>;
  /** Fallback: `<button>` with the header and the sort icon. */
  SortTrigger: ComponentType<SortTriggerSlotProps>;
  /** Fallback: inline SVG arrows. */
  SortIcon: ComponentType<SortIconSlotProps>;
  /** Fallback: chevron `<button>` that rotates when expanded. */
  ExpandToggle: ComponentType<ExpandToggleSlotProps>;
  /** Fallback: shimmering bar. */
  Skeleton: ComponentType<SkeletonSlotProps>;
  /** Fallback: centered muted message. */
  Empty: ComponentType<EmptySlotProps>;
  /** Fallback: message with a retry button, `role="alert"`. */
  Error: ComponentType<ErrorSlotProps>;
  /** Fallback: previous / next, page info and page-size select. */
  Pagination: ComponentType<PaginationSlotProps>;
  /** Fallback: chevron `<button>`. */
  PaginationButton: ComponentType<PaginationButtonSlotProps>;
  /** Fallback: labelled native `<select>`. */
  PageSizeSelect: ComponentType<PageSizeSelectSlotProps>;
}

/**
 * Data table labels
 *
 * Every piece of text the table renders. Pass any subset through `labels`
 * to translate or reword it.
 *
 * @example
 * ```tsx
 * <DataTable
 *   labels={{
 *     empty: "لا توجد بيانات",
 *     rowsPerPage: "عدد الصفوف",
 *     pageInfo: (page, count) => `صفحة ${page} من ${count}`,
 *   }}
 * />
 * ```
 */
export interface DataTableLabels {
  /** Empty state message. Default: "No data found". */
  empty: ReactNode;
  /** Error state message. */
  error: ReactNode;
  /** Retry button text. Default: "Retry". */
  retry: ReactNode;
  /** Page-size select label. Default: "Rows per page". */
  rowsPerPage: ReactNode;
  /** Page info. Default: `Page ${page} of ${pageCount}`. */
  pageInfo: (page: number, pageCount: number) => ReactNode;
  /** Accessible name of the pagination landmark. */
  pagination: string;
  /** Accessible name of the previous-page button. */
  previousPage: string;
  /** Accessible name of the next-page button. */
  nextPage: string;
  /** Accessible name of the select-all checkbox. */
  selectAll: string;
  /** Accessible name of each row checkbox. */
  selectRow: string;
  /** Accessible name of the expand toggle on a collapsed row. */
  expandRow: string;
  /** Accessible name of the expand toggle on an expanded row. */
  collapseRow: string;
}

/**
 * Data table slot props
 *
 * Extra DOM props merged into element slots: classNames are joined, styles
 * merged, `onClick` handlers chained, and anything else overrides.
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
  /** Props for each body `Row`. */
  row?: (row: DataTableRow<T>) => RowSlotProps | undefined;
  /** Props for each body `Cell`. */
  cell?: (cell: DataTableCell<T>) => CellSlotProps | undefined;
}
