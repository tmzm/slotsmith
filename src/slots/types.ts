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

export type SortDirection = false | "asc" | "desc";

/* -------------------------------------------------------------------------- */
/* Element slots: receive plain DOM props only, so any UI library's table      */
/* primitives (shadcn, MUI, Mantine, …) can be dropped in unchanged. State is  */
/* exposed as data-* attributes; custom rows read the row via useDataTableRow. */
/* -------------------------------------------------------------------------- */

export type RootSlotProps = HTMLAttributes<HTMLDivElement>;
export type TableSlotProps = TableHTMLAttributes<HTMLTableElement>;
export type SectionSlotProps = HTMLAttributes<HTMLTableSectionElement>;
export type RowSlotProps = HTMLAttributes<HTMLTableRowElement>;
export type HeaderCellSlotProps = ThHTMLAttributes<HTMLTableCellElement>;
export type CellSlotProps = TdHTMLAttributes<HTMLTableCellElement>;

/* -------------------------------------------------------------------------- */
/* Widget slots: receive semantic props; write a tiny adapter for your library. */
/* -------------------------------------------------------------------------- */

export interface CheckboxSlotProps {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
}

export interface SortTriggerSlotProps {
  direction: SortDirection;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}

export interface SortIconSlotProps {
  direction: SortDirection;
}

export interface ExpandToggleSlotProps {
  expanded: boolean;
  depth: number;
  onToggle: () => void;
  "aria-label": string;
}

export interface SkeletonSlotProps {
  rowIndex: number;
  columnIndex: number;
}

export interface EmptySlotProps {
  message: ReactNode;
}

export interface ErrorSlotProps {
  error: unknown;
  message: ReactNode;
  retryLabel: ReactNode;
  onRetry?: () => void;
}

export interface PaginationSlotProps {
  pageIndex: number;
  /** At least 1, even when there are no rows. */
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  previousPage: () => void;
  nextPage: () => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  labels: DataTableLabels;
}

export interface PaginationButtonSlotProps {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
  "aria-label": string;
}

export interface PageSizeSelectSlotProps {
  value: number;
  options: number[];
  onValueChange: (pageSize: number) => void;
  label: ReactNode;
}

export interface DataTableComponents {
  Root: ComponentType<RootSlotProps>;
  Table: ComponentType<TableSlotProps>;
  Head: ComponentType<SectionSlotProps>;
  Body: ComponentType<SectionSlotProps>;
  HeaderRow: ComponentType<RowSlotProps>;
  HeaderCell: ComponentType<HeaderCellSlotProps>;
  Row: ComponentType<RowSlotProps>;
  Cell: ComponentType<CellSlotProps>;
  Checkbox: ComponentType<CheckboxSlotProps>;
  SortTrigger: ComponentType<SortTriggerSlotProps>;
  SortIcon: ComponentType<SortIconSlotProps>;
  ExpandToggle: ComponentType<ExpandToggleSlotProps>;
  Skeleton: ComponentType<SkeletonSlotProps>;
  Empty: ComponentType<EmptySlotProps>;
  Error: ComponentType<ErrorSlotProps>;
  Pagination: ComponentType<PaginationSlotProps>;
  PaginationButton: ComponentType<PaginationButtonSlotProps>;
  PageSizeSelect: ComponentType<PageSizeSelectSlotProps>;
}

export interface DataTableLabels {
  empty: ReactNode;
  error: ReactNode;
  retry: ReactNode;
  rowsPerPage: ReactNode;
  pageInfo: (page: number, pageCount: number) => ReactNode;
  pagination: string;
  previousPage: string;
  nextPage: string;
  selectAll: string;
  selectRow: string;
  expandRow: string;
  collapseRow: string;
}

/** Extra DOM props merged into element slots (classNames are joined). */
export interface DataTableSlotProps<T extends RowData> {
  table?: TableSlotProps;
  head?: SectionSlotProps;
  body?: SectionSlotProps;
  headerRow?: RowSlotProps;
  headerCell?: (header: DataTableHeader<T>) => HeaderCellSlotProps | undefined;
  row?: (row: DataTableRow<T>) => RowSlotProps | undefined;
  cell?: (cell: DataTableCell<T>) => CellSlotProps | undefined;
}
