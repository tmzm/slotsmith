/**
 * slotsmith
 *
 * A headless, fully type-safe React data table built on TanStack Table v9,
 * with swappable UI slots and plain-HTML fallbacks.
 *
 * @example
 * ```tsx
 * import { DataTable } from "slotsmith";
 * import "slotsmith/styles.css";
 *
 * <DataTable data={users} columns={columns} />;
 * ```
 *
 * @packageDocumentation
 */

export { DataTable, DataTableProvider, DataTableRoot } from "./DataTable";
export type { DataTableProps, DataTableProviderProps, DataTableRootProps } from "./DataTable";

export {
  DataTableBody,
  DataTableDragHandle,
  DataTableFoot,
  DataTableHead,
  DataTablePagination,
  DataTableRowView,
  DataTableStatusRows,
  DataTableTable,
  mergeProps,
  useColumnSpan,
} from "./parts";

export { useDataTable, defaultGetRowId, DEFAULT_PAGE_SIZE_OPTIONS } from "./core/useDataTable";
export type { UseDataTableOptions, DataTableModel, DataTableStatus } from "./core/useDataTable";
export type { RowReorderAttributes, RowReorderModel } from "./core/useRowReorder";
export { moveItem } from "./core/reorder";
export type { DropPosition, ReorderWhileSorted, RowOrderChange } from "./core/reorder";

export type {
  DataTableColumnEdit,
  DataTableColumnEditInput,
  DataTableColumnEditorProps,
  DataTableEditOption,
  DataTableEditorKind,
  DataTableRowChange,
  DataTableSpreadsheetOptions,
  DataTableValueChange,
  DataTableValueChangeSource,
} from "./core/spreadsheet/types";
export type { SpreadsheetGridProps, SpreadsheetModel } from "./core/spreadsheet/useSpreadsheet";
export type { SpreadsheetState, SpreadsheetEditing } from "./core/spreadsheet/store";
export type { CellPosition } from "./core/spreadsheet/grid";

export { dataTableFeatures, createDataTableColumnHelper } from "./core/features";
export type {
  DataTableCell,
  DataTableColumnDef,
  DataTableColumnEditField,
  DataTableColumnHelper,
  DataTableColumnMeta,
  DataTableFeatures,
  DataTableHeader,
  DataTableInstance,
  DataTableRow,
} from "./core/features";

export { useDataTableContext, useDataTableRow } from "./slots/context";
export type { DataTableContextValue } from "./slots/context";
export { fallbackComponents, defaultLabels, cx } from "./slots/fallbacks";
export type { DataTableSlotProps } from "./slots/slotProps";
export * from "./slots/types";

export type {
  ExpandedState as DataTableExpandedState,
  PaginationState as DataTablePaginationState,
  SortingState as DataTableSortingState,
} from "@tanstack/react-table";
