import type { RowData } from "@tanstack/react-table";
import type { HTMLAttributes, ReactNode } from "react";
import { useDataTable, type UseDataTableOptions } from "./core/useDataTable";
import {
  DataTableBody,
  DataTableFoot,
  DataTableHead,
  DataTablePagination,
  DataTableRowView,
  DataTableStatusRows,
  DataTableTable,
} from "./parts";
import { DataTableContext, useDataTableContext, type DataTableContextValue } from "./slots/context";
import { defaultLabels, fallbackComponents } from "./slots/fallbacks";
import type { DataTableComponents, DataTableLabels, DataTableSlotProps } from "./slots/types";

/**
 * Provider props
 *
 * The table options plus how to render it: slots, labels and slot props.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableProviderProps<T extends RowData> extends UseDataTableOptions<T> {
  /** Replace any UI slot; the rest fall back to the built-in plain-HTML ones. */
  components?: Partial<DataTableComponents>;
  /** Override any text, e.g. to translate the table. */
  labels?: Partial<DataTableLabels>;
  /** Extra DOM props for element slots, e.g. per-row classNames. */
  slotProps?: DataTableSlotProps<T>;
  /** Called when a body row is clicked (not its checkbox or expand toggle). */
  onRowClick?: DataTableContextValue<T>["onRowClick"];
  /** Your layout, built from the compound parts and your own components. */
  children?: ReactNode;
}

/**
 * Without undefined
 *
 * Drops `undefined` entries, so `{ Row: undefined }` keeps the fallback.
 */
const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;

/**
 * DataTable.Provider
 *
 * Runs the table and shares it with the compound parts and
 * `useDataTableContext()`. Renders no markup itself, so you choose the layout.
 *
 * @typeParam T - The row data type.
 * @param props - See {@link DataTableProviderProps}.
 *
 * @example
 * ```tsx
 * <DataTable.Provider data={users} columns={columns} enableRowSelection>
 *   <MyToolbar />
 *   <DataTable.Root>
 *     <DataTable.Pagination />
 *     <DataTable.Table maxHeight={480} />
 *   </DataTable.Root>
 * </DataTable.Provider>
 * ```
 */
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

/**
 * Root props
 *
 * Plain `<div>` props plus the table's size and striping.
 */
export interface DataTableRootProps extends HTMLAttributes<HTMLDivElement> {
  /** Density; sets `data-size`. */
  size?: "sm" | "default";
  /** Alternate row backgrounds; sets `data-striped`. */
  striped?: boolean;
}

/**
 * DataTable.Root
 *
 * The `Root` slot, carrying `data-status`, `data-size`, `data-striped` and
 * `aria-busy` while loading.
 *
 * @param props - See {@link DataTableRootProps}.
 *
 * @example
 * ```tsx
 * <DataTable.Root size="default" striped className="shadow-sm">
 *   <DataTable.Table />
 * </DataTable.Root>
 * ```
 */
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

/**
 * DataTable props
 *
 * The provider props, the root's `<div>` props, and layout options.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableProps<T extends RowData>
  extends Omit<DataTableProviderProps<T>, "children">,
    Omit<DataTableRootProps, "children" | "onError"> {
  /** Hide the pagination UI while still paginating. */
  hidePagination?: boolean;
}

/**
 * Provider keys
 *
 * The `<DataTable>` props that go to the provider; the rest go to the root.
 */
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

/**
 * Missing provider keys
 *
 * Compile-time guard: fails to type-check when a provider option is missing
 * from {@link PROVIDER_KEYS}.
 */
type MissingProviderKeys = Exclude<
  keyof DataTableProviderProps<RowData>,
  (typeof PROVIDER_KEYS)[number] | "children"
>;
const _allProviderKeysListed: [MissingProviderKeys] extends [never] ? true : MissingProviderKeys = true;
void _allProviderKeysListed;

const providerKeys = new Set<string>(PROVIDER_KEYS);

/**
 * Split data table props
 *
 * Splits `<DataTable>` props into provider options and root / layout props.
 * Useful when building your own table component on the same props.
 *
 * @typeParam T - The row data type.
 * @typeParam P - The full props type.
 * @param props - The component's props.
 * @returns `providerProps` for `DataTable.Provider` and `rest` for your layout.
 *
 * @example
 * ```tsx
 * function MyTable<T>(props: DataTableProps<T> & { title: string }) {
 *   const { providerProps, rest } = splitDataTableProps<T, typeof props>(props);
 *   const { title, ...rootProps } = rest;
 *   return (
 *     <DataTable.Provider {...providerProps}>
 *       <h2>{title}</h2>
 *       <DataTable.Root {...rootProps}><DataTable.Table /></DataTable.Root>
 *     </DataTable.Provider>
 *   );
 * }
 * ```
 */
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
 * DataTable component
 *
 * The default layout: root, table and pagination. Exported as `DataTable`.
 */
function DataTableComponent<T extends RowData>(props: DataTableProps<T>) {
  const { providerProps, rest } = splitDataTableProps<T, DataTableProps<T>>(props);
  const { size = "sm", hidePagination, ...htmlProps } = rest;

  return (
    <DataTableProvider {...providerProps}>
      <DataTableRoot size={size} {...htmlProps}>
        <DataTableTable />
        {!hidePagination && <DataTablePagination />}
      </DataTableRoot>
    </DataTableProvider>
  );
}

/**
 * DataTable
 *
 * A headless-first data table on TanStack Table v9. Every piece of UI is a
 * replaceable slot (`components`), every string a label (`labels`), and the
 * built-in fallbacks are plain HTML styled by the optional `styles.css`.
 * Also exposes the compound parts (`DataTable.Provider`, `.Root`, `.Table`,
 * `.Head`, `.Body`, `.Row`, `.StatusRows`, `.Pagination`) for custom layouts.
 *
 * @typeParam T - The row data type.
 * @param props - See {@link DataTableProps}.
 *
 * @example
 * ```tsx
 * import { DataTable, type DataTableColumnDef } from "slotsmith";
 * import "slotsmith/styles.css";
 *
 * const columns: DataTableColumnDef<User>[] = [
 *   { accessorKey: "name", header: "Name" },
 *   { accessorKey: "email", header: "Email" },
 * ];
 *
 * <DataTable<User> data={users} columns={columns} enableRowSelection onSelectionChange={setSelected} />;
 * ```
 */
export const DataTable = Object.assign(DataTableComponent, {
  Provider: DataTableProvider,
  Root: DataTableRoot,
  Table: DataTableTable,
  Head: DataTableHead,
  Foot: DataTableFoot,
  Body: DataTableBody,
  Row: DataTableRowView,
  StatusRows: DataTableStatusRows,
  Pagination: DataTablePagination,
});
