import type { RowData } from "@tanstack/react-table";
import type { HTMLAttributes, ReactNode } from "react";
import { useDataTable, type UseDataTableOptions } from "./core/useDataTable";
import {
  DataTableBody,
  DataTableHead,
  DataTablePagination,
  DataTableRowView,
  DataTableStatusRows,
  DataTableTable,
} from "./parts";
import { DataTableContext, useDataTableContext, type DataTableContextValue } from "./slots/context";
import { defaultLabels, fallbackComponents } from "./slots/fallbacks";
import type { DataTableComponents, DataTableLabels, DataTableSlotProps } from "./slots/types";

export interface DataTableProviderProps<T extends RowData> extends UseDataTableOptions<T> {
  /** Replace any UI slot; the rest fall back to the built-in plain-HTML ones. */
  components?: Partial<DataTableComponents>;
  /** Override any text (i18n). */
  labels?: Partial<DataTableLabels>;
  /** Extra DOM props for element slots, e.g. per-row classNames. */
  slotProps?: DataTableSlotProps<T>;
  onRowClick?: DataTableContextValue<T>["onRowClick"];
  children?: ReactNode;
}

const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;

/** Runs the table and shares it with the compound parts. Renders no markup itself. */
export function DataTableProvider<T extends RowData>({
  components,
  labels,
  slotProps,
  onRowClick,
  children,
  ...options
}: DataTableProviderProps<T>) {
  const model = useDataTable(options);

  const value: DataTableContextValue<T> = {
    ...model,
    components: { ...fallbackComponents, ...withoutUndefined(components) },
    labels: { ...defaultLabels, ...withoutUndefined(labels) },
    slotProps: slotProps ?? {},
    onRowClick,
  };

  return <DataTableContext.Provider value={value}>{children}</DataTableContext.Provider>;
}

export interface DataTableRootProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default";
  striped?: boolean;
}

/** The `Root` slot, carrying status / size / striped as data attributes. */
export function DataTableRoot({ size, striped, ...props }: DataTableRootProps) {
  const { components: C, status } = useDataTableContext();
  return (
    <C.Root
      data-status={status}
      data-size={size}
      data-striped={striped || undefined}
      aria-busy={status === "loading" || undefined}
      {...props}
    />
  );
}

export interface DataTableProps<T extends RowData>
  extends Omit<DataTableProviderProps<T>, "children">,
    Omit<DataTableRootProps, "children" | "onError"> {
  /** Rendered below the table, above the pagination (e.g. a totals bar). */
  footer?: ReactNode;
  /** Hide the pagination UI while still paginating. */
  hidePagination?: boolean;
}

const PROVIDER_KEYS = [
  "data", "columns", "getRowId",
  "sorting", "onSortingChange", "defaultSorting", "manualSorting", "enableMultiSort",
  "pagination", "onPaginationChange", "defaultPagination", "manualPagination", "rowCount",
  "pageSizeOptions", "enablePagination",
  "enableRowSelection", "selection", "onSelectionChange", "defaultSelection", "resetSelectionOnPageChange",
  "getSubRows", "getRowCanExpand", "expanded", "onExpandedChange", "defaultExpanded", "paginateExpandedRows",
  "loading", "error", "onRetry", "tableOptions",
  "components", "labels", "slotProps", "onRowClick",
] as const;

// Compile-time guard: every provider option must be routed to the provider.
type MissingProviderKeys = Exclude<
  keyof DataTableProviderProps<RowData>,
  (typeof PROVIDER_KEYS)[number] | "children"
>;
const _allProviderKeysListed: [MissingProviderKeys] extends [never] ? true : MissingProviderKeys = true;
void _allProviderKeysListed;

const providerKeys = new Set<string>(PROVIDER_KEYS);

/** Splits `<DataTable>` props into provider options and root / layout props. */
export function splitDataTableProps<T extends RowData, P extends DataTableProps<T>>(props: P) {
  const providerProps: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (providerKeys.has(key) ? providerProps : rest)[key] = value;
  }
  return {
    providerProps: providerProps as unknown as DataTableProviderProps<T>,
    rest: rest as Omit<P, keyof DataTableProviderProps<T>>,
  };
}

/**
 * A headless-first data table. Every piece of UI is a replaceable slot
 * (`components`), every string is a label (`labels`), and the built-in
 * fallbacks are plain HTML styled by the optional `styles.css`.
 */
function DataTableComponent<T extends RowData>(props: DataTableProps<T>) {
  const { providerProps, rest } = splitDataTableProps<T, DataTableProps<T>>(props);
  const { size = "sm", footer, hidePagination, ...htmlProps } = rest;

  return (
    <DataTableProvider {...providerProps}>
      <DataTableRoot size={size} {...htmlProps}>
        <DataTableTable />
        {footer}
        {!hidePagination && <DataTablePagination />}
      </DataTableRoot>
    </DataTableProvider>
  );
}

/** `<DataTable>` plus its compound parts for custom layouts. */
export const DataTable = Object.assign(DataTableComponent, {
  Provider: DataTableProvider,
  Root: DataTableRoot,
  Table: DataTableTable,
  Head: DataTableHead,
  Body: DataTableBody,
  Row: DataTableRowView,
  StatusRows: DataTableStatusRows,
  Pagination: DataTablePagination,
});
