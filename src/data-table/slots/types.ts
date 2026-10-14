import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

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
  /** Accessible name, from `labels.selectRow` / `labels.selectAll`, or a checkbox column's header in spreadsheet mode. */
  "aria-label": string;
  /**
   * `-1` in a spreadsheet cell, where the cell holds the focus and Space
   * toggles the box: put it on the control so Tab skips it.
   */
  tabIndex?: number;
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
 * Widget slot for the rows-per-page picker of the fallback `Pagination`. The
 * fallback is the slotsmith `Autocomplete` as a plain single select, labelled
 * by `label` and following the table's `locale`, so the data table's bundle
 * includes the autocomplete. Replace the slot to use your own select.
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
 * Drag handle slot props
 *
 * Element slot: plain `<button>` props for the handle a row is dragged by
 * when `enableRowReorder` is on. The table supplies the accessible name, the
 * pointer and key handlers and a ref, so a library's icon button that spreads
 * its props works as is. The `color` attribute is left out so buttons with
 * their own `color` prop fit. Carries `data-dragging` while its row is moving.
 *
 * @example
 * ```tsx
 * const DragHandle = (props: DragHandleSlotProps) => (
 *   <Button variant="ghost" size="icon" {...props}>
 *     <GripVertical />
 *   </Button>
 * );
 * <DataTable enableRowReorder components={{ DragHandle }} />;
 * ```
 */
export type DragHandleSlotProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  ref?: Ref<HTMLButtonElement>;
  "data-dragging"?: "";
};

/**
 * Cell editor common props
 *
 * What every built-in cell editor gets, whatever its kind.
 */
interface CellEditorCommonProps {
  /** From the `editCell` label, with the column's header. */
  "aria-label": string;
  /** The validation message of the last commit, or `null`. Show it, and mark the control invalid. */
  error: string | null;
  /**
   * Ends the edit and writes the draft. A picker passes the picked text so
   * the write does not wait for a re-render.
   */
  onCommit: (text?: string) => void;
  /** Ends the edit without writing. */
  onCancel: () => void;
}

/**
 * Cell editor slot props
 *
 * Widget slot for editing a cell in spreadsheet mode, one kind at a time.
 * Every value is text: the column's `parse` turns it into the row's value.
 * The table moves focus into the editor when it opens, and handles Enter,
 * Tab, Escape and the arrow keys from it, unless the editor prevents the
 * key's default (an open popup's own keys). Render it with no outer margin:
 * it sits inside the cell.
 *
 * @example
 * ```tsx
 * const CellEditor = (props: CellEditorSlotProps) =>
 *   props.kind === "text" || props.kind === "number" ? (
 *     <Input value={props.value} onChange={(event) => props.onValueChange(event.target.value)}
 *       aria-label={props["aria-label"]} aria-invalid={props.error !== null} />
 *   ) : (
 *     fallbackComponents.CellEditor(props)
 *   );
 * ```
 */
export type CellEditorSlotProps = CellEditorCommonProps &
  (
    | {
        kind: "text" | "number";
        /** The draft text. */
        value: string;
        onValueChange: (text: string) => void;
      }
    | {
        kind: "select";
        /** The chosen option's label; `""` when none is. */
        value: string;
        /** Every option's label, in order. */
        options: readonly string[];
        /** The text typed to start the edit, for the search; `""` otherwise. */
        search: string;
      }
    | {
        kind: "date";
        /** The ISO date (`YYYY-MM-DD`); `""` when empty. */
        value: string;
        /** Replaces the draft, for an editor that writes on Enter rather than on a pick. */
        onValueChange: (date: string) => void;
      }
  );

/**
 * Fill handle slot props
 *
 * Element slot: plain `<span>` props for the small square on the selection's
 * corner in spreadsheet mode. Dragging it fills the cells it is dragged
 * over. It carries `data-fill-handle`, which the table finds it by.
 */
export type FillHandleSlotProps = HTMLAttributes<HTMLSpanElement> & {
  "data-fill-handle": "";
  "aria-hidden": true;
};

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
  /** Outer element. Fallback: `<div class="sdt">`. */
  Root: ComponentType<RootSlotProps>;
  /** Fallback: `<table class="sdt__table">`. */
  Table: ComponentType<TableSlotProps>;
  /** Fallback: `<thead>`. */
  Head: ComponentType<SectionSlotProps>;
  /** Fallback: `<tbody>`. */
  Body: ComponentType<SectionSlotProps>;
  /** Fallback: `<tr>` in the head. */
  HeaderRow: ComponentType<RowSlotProps>;
  /** Fallback: `<th>`. */
  HeaderCell: ComponentType<HeaderCellSlotProps>;
  /** Fallback: `<tfoot>`. Rendered only when a column defines `footer`. */
  Foot: ComponentType<SectionSlotProps>;
  /** Fallback: `<tr>` in the foot. */
  FooterRow: ComponentType<RowSlotProps>;
  /** Fallback: `<td>` in the foot. */
  FooterCell: ComponentType<CellSlotProps>;
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
  /** Fallback: the slotsmith `Autocomplete` as a labelled single select (no search, no clear). */
  PageSizeSelect: ComponentType<PageSizeSelectSlotProps>;
  /** Fallback: `<button class="sdt__drag">` with a six-dot grip. Used when `enableRowReorder` is on. */
  DragHandle: ComponentType<DragHandleSlotProps>;
  /**
   * Fallback: an `<input>` for text and numbers, the slotsmith `Autocomplete`
   * for selects, and for dates `spreadsheet.datePicker` (the slotsmith
   * `DatePicker`) or `<input type="date">`. Used in spreadsheet mode.
   */
  CellEditor: ComponentType<CellEditorSlotProps>;
  /** Fallback: `<span class="sdt__fill-handle">`. Used in spreadsheet mode. */
  FillHandle: ComponentType<FillHandleSlotProps>;
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
  /** Accessible name of each row's drag handle. Default: "Reorder row". */
  reorderRow: string;
  /** How to move a row with the keyboard, given to assistive technology with the drag handle. */
  reorderInstructions: string;
  /** Announced when a row is lifted. Default: `Row lifted. Position ${position} of ${total}.` */
  reorderLifted: (position: number, total: number) => string;
  /** Announced on each keyboard step. Default: `Position ${position} of ${total}.` */
  reorderMoved: (position: number, total: number) => string;
  /** Announced when a row is dropped. Default: `Row dropped at position ${position} of ${total}.` */
  reorderDropped: (position: number, total: number) => string;
  /** Announced when a move is cancelled. Default: "Reordering cancelled." */
  reorderCancelled: string;
  /** Announced after a step or a drop that moves a row across parents, with its depth from 1. Default: `Level ${level}.` */
  reorderLevel: (level: number) => string;
  /** Spreadsheet mode: the cell editor's accessible name. Default: `Edit ${column}`. */
  editCell: (column: string) => string;
  /** Spreadsheet mode: a number cell got text that is not a number. Default: "Enter a number." */
  invalidNumber: string;
  /** Spreadsheet mode: a select cell got text that matches no option. Default: "Choose one of the options." */
  invalidOption: string;
  /** Spreadsheet mode: a date cell got text that is not a date. Default: "Enter a valid date." */
  invalidDate: string;
  /** Spreadsheet mode: a checkbox cell got text that is neither true nor false. Default: "Enter TRUE or FALSE." */
  invalidBoolean: string;
  /** Spreadsheet mode: announced after a copy. Default: `${count} cells copied.` */
  cellsCopied: (count: number) => string;
  /** Spreadsheet mode: announced after a cut. Default: `${count} cells cut.` */
  cellsCut: (count: number) => string;
  /** Spreadsheet mode: announced after a paste; `skipped` cells did not fit their column. */
  cellsPasted: (count: number, skipped: number) => string;
  /** Spreadsheet mode: announced after Delete. Default: `${count} cells cleared.` */
  cellsCleared: (count: number) => string;
  /** Spreadsheet mode: announced after a fill. Default: `${count} cells filled.` */
  cellsFilled: (count: number) => string;
  /** Spreadsheet mode: announced after an undo. Default: "Undone." */
  undone: string;
  /** Spreadsheet mode: announced after a redo. Default: "Redone." */
  redone: string;
}
