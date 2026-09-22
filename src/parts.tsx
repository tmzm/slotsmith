import { flexRender, type RowData } from "@tanstack/react-table";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import type { DataTableColumnMeta, DataTableRow } from "./core/features";
import { DataTableRowContext, useDataTableContext } from "./slots/context";
import { cx } from "./slots/fallbacks";

type AnyProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

/**
 * Merge props
 *
 * Merges two prop objects the way slot props are merged: classNames are
 * joined, styles merged, `onClick` handlers chained, and anything else in
 * `extra` wins.
 *
 * @param base - The props the table computes.
 * @param extra - The props to layer on top.
 * @returns The merged props.
 *
 * @example
 * ```ts
 * mergeProps({ className: "a", style: { color: "red" } }, { className: "b" });
 * // { className: "a b", style: { color: "red" } }
 * ```
 */
export function mergeProps<P extends object>(base: P, extra?: Partial<P>): P {
  const a = base as AnyProps;
  const b = (extra ?? {}) as AnyProps;
  const merged: AnyProps = {
    ...a,
    ...b,
    className: cx(a.className, b.className),
    style: a.style || b.style ? { ...a.style, ...b.style } : undefined,
    onClick:
      a.onClick && b.onClick
        ? (event: never) => {
            (a.onClick as (e: never) => void)(event);
            (b.onClick as (e: never) => void)(event);
          }
        : (b.onClick ?? a.onClick),
  };
  /** An explicit `undefined` would override a slot's own default (e.g. `className`). */
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
  return merged as P;
}

/**
 * Align style
 *
 * The inline `text-align` for a column's `meta.align`.
 */
const alignStyle = (meta?: DataTableColumnMeta): CSSProperties | undefined =>
  meta?.align ? { textAlign: meta.align } : undefined;

/**
 * useColumnSpan
 *
 * The number of cells a full-width row must span, counting the checkbox column.
 *
 * @returns The column span.
 *
 * @example
 * ```tsx
 * function TotalsRow() {
 *   const colSpan = useColumnSpan();
 *   return <tr><td colSpan={colSpan}>Total: 42</td></tr>;
 * }
 * ```
 */
export function useColumnSpan() {
  const { table, selectable } = useDataTableContext();
  return table.getAllLeafColumns().length + (selectable ? 1 : 0);
}

/**
 * DataTable.Head
 *
 * The `Head` slot with a `HeaderRow` per header group: the select-all
 * checkbox, then a `HeaderCell` per column with its `SortTrigger` when sortable.
 *
 * @example
 * ```tsx
 * <table>
 *   <DataTable.Head />
 *   <MyOwnBody />
 * </table>
 * ```
 */
export function DataTableHead() {
  const { table, components: C, labels, slotProps, selectable } = useDataTableContext();
  const pageRows = table.getRowModel().rows;

  return (
    <C.Head {...slotProps.head}>
      {table.getHeaderGroups().map((headerGroup, groupIndex) => (
        <C.HeaderRow key={headerGroup.id} {...slotProps.headerRow}>
          {selectable &&
            (groupIndex === 0 ? (
              <C.HeaderCell
                className="rdt__cell--select"
                rowSpan={table.getHeaderGroups().length}
                data-slot="select"
              >
                <C.Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                  disabled={!pageRows.some((row) => row.getCanSelect())}
                  onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
                  aria-label={labels.selectAll}
                />
              </C.HeaderCell>
            ) : null)}

          {headerGroup.headers.map((header) => {
            const column = header.column;
            const meta = column.columnDef.meta;
            const canSort = column.getCanSort();
            const direction = column.getIsSorted();
            const content = header.isPlaceholder
              ? null
              : flexRender(column.columnDef.header, header.getContext());

            return (
              <C.HeaderCell
                key={header.id}
                {...mergeProps(
                  {
                    colSpan: header.colSpan > 1 ? header.colSpan : undefined,
                    className: meta?.headerClassName,
                    style: alignStyle(meta),
                    "aria-sort": canSort
                      ? direction === "asc"
                        ? "ascending"
                        : direction === "desc"
                          ? "descending"
                          : "none"
                      : undefined,
                    "data-align": meta?.align,
                    "data-sorted": direction || undefined,
                  } as HTMLAttributes<HTMLTableCellElement>,
                  slotProps.headerCell?.(header),
                )}
              >
                {canSort && !header.isPlaceholder ? (
                  <C.SortTrigger
                    direction={direction}
                    onClick={(event) => column.getToggleSortingHandler()?.(event)}
                  >
                    {content}
                  </C.SortTrigger>
                ) : (
                  content
                )}
              </C.HeaderCell>
            );
          })}
        </C.HeaderRow>
      ))}
    </C.Head>
  );
}

/**
 * Tree indentation
 *
 * Inline-start padding per nesting level, in rem.
 */
const INDENT_REM = 1.25;

/**
 * Row view props
 *
 * @typeParam T - The row data type.
 */
export interface DataTableRowViewProps<T extends RowData> {
  /** The row to render. */
  row: DataTableRow<T>;
  /** Extra style for the `Row` slot, e.g. from a virtualizer. */
  style?: CSSProperties;
}

/**
 * DataTable.Row
 *
 * One body row: the `Row` slot with its checkbox cell and a `Cell` per
 * column, the first one indented and holding the `ExpandToggle` in tree
 * tables. Provides the row to `useDataTableRow()`.
 *
 * @typeParam T - The row data type.
 * @param props - See {@link DataTableRowViewProps}.
 *
 * @example
 * ```tsx
 * // A body that pins starred rows to the top.
 * function PinnedBody() {
 *   const { table } = useDataTableContext<Item>();
 *   const rows = table.getRowModel().rows;
 *   const sorted = [...rows.filter((r) => r.original.starred), ...rows.filter((r) => !r.original.starred)];
 *   return <tbody>{sorted.map((row) => <DataTable.Row key={row.id} row={row} />)}</tbody>;
 * }
 * ```
 */
export function DataTableRowView<T extends RowData>({ row, style }: DataTableRowViewProps<T>) {
  const { components: C, labels, slotProps, selectable, expandable, onRowClick } =
    useDataTableContext<T>();
  const selected = row.getIsSelected();
  const expanded = row.getIsExpanded();

  const rowProps = mergeProps(
    {
      style,
      onClick: onRowClick ? (event) => onRowClick(row, event) : undefined,
      "data-state": selected ? "selected" : undefined,
      "data-depth": row.depth,
      "data-expanded": expandable && row.getCanExpand() ? String(expanded) : undefined,
      "data-clickable": onRowClick ? "" : undefined,
    } as HTMLAttributes<HTMLTableRowElement>,
    slotProps.row?.(row),
  );

  return (
    <DataTableRowContext.Provider value={row as unknown as DataTableRow<any>}>
      <C.Row {...rowProps}>
        {selectable && (
          <C.Cell className="rdt__cell--select" data-slot="select">
            <C.Checkbox
              checked={selected}
              indeterminate={row.getIsSomeSelected() && !selected}
              disabled={!row.getCanSelect()}
              onCheckedChange={(checked) => row.toggleSelected(checked)}
              aria-label={labels.selectRow}
            />
          </C.Cell>
        )}

        {row.getAllCells().map((cell, index) => {
          const meta = cell.column.columnDef.meta;
          let content: ReactNode = flexRender(cell.column.columnDef.cell, cell.getContext());

          if (expandable && index === 0) {
            content = (
              <div
                className="rdt__tree"
                style={{ paddingInlineStart: `${row.depth * INDENT_REM}rem` }}
              >
                {row.getCanExpand() ? (
                  <C.ExpandToggle
                    expanded={expanded}
                    depth={row.depth}
                    onToggle={() => row.toggleExpanded()}
                    aria-label={expanded ? labels.collapseRow : labels.expandRow}
                  />
                ) : (
                  <span className="rdt__tree-spacer" aria-hidden="true" />
                )}
                {content}
              </div>
            );
          }

          return (
            <C.Cell
              key={cell.id}
              {...mergeProps(
                {
                  className: meta?.cellClassName,
                  style: alignStyle(meta),
                  "data-align": meta?.align,
                } as HTMLAttributes<HTMLTableCellElement>,
                slotProps.cell?.(cell),
              )}
            >
              {content}
            </C.Cell>
          );
        })}
      </C.Row>
    </DataTableRowContext.Provider>
  );
}

/**
 * DataTable.StatusRows
 *
 * The body content for every status but `"ready"`: one skeleton row per
 * page-size row while loading, or a full-width `Error` / `Empty` row.
 *
 * @returns The status rows, or `null` when there are rows to show.
 *
 * @example
 * ```tsx
 * <tbody>{status === "ready" ? <MyRows /> : <DataTable.StatusRows />}</tbody>
 * ```
 */
export function DataTableStatusRows() {
  const { table, status, error, onRetry, components: C, labels, paginationEnabled } =
    useDataTableContext();
  const colSpan = useColumnSpan();

  if (status === "loading") {
    const rowCount = paginationEnabled ? table.state.pagination.pageSize : 5;
    return (
      <>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <C.Row key={rowIndex} data-state="loading" aria-hidden="true">
            {Array.from({ length: colSpan }, (_, columnIndex) => (
              <C.Cell key={columnIndex}>
                <C.Skeleton rowIndex={rowIndex} columnIndex={columnIndex} />
              </C.Cell>
            ))}
          </C.Row>
        ))}
      </>
    );
  }

  if (status === "error" || status === "empty") {
    return (
      <C.Row data-state={status}>
        <C.Cell colSpan={colSpan}>
          {status === "error" ? (
            <C.Error error={error} message={labels.error} retryLabel={labels.retry} onRetry={onRetry} />
          ) : (
            <C.Empty message={labels.empty} />
          )}
        </C.Cell>
      </C.Row>
    );
  }

  return null;
}

/**
 * DataTable.Body
 *
 * The `Body` slot with a {@link DataTableRowView} per row, or the
 * {@link DataTableStatusRows} while loading, failed or empty.
 *
 * @example
 * ```tsx
 * <table>
 *   <MyOwnHead />
 *   <DataTable.Body />
 * </table>
 * ```
 */
export function DataTableBody() {
  const { table, status, components: C, slotProps } = useDataTableContext();
  return (
    <C.Body {...slotProps.body}>
      {status === "ready" ? (
        table.getRowModel().rows.map((row) => <DataTableRowView key={row.id} row={row} />)
      ) : (
        <DataTableStatusRows />
      )}
    </C.Body>
  );
}

/**
 * Table part props
 */
export interface DataTableTableProps {
  /** Extra content inside the table, after the body (e.g. a `<tfoot>`). */
  children?: ReactNode;
  /** Replaces the default body; used by the virtual entry. */
  body?: ReactNode;
  /** Caps the scroll area's height; the header stays sticky. */
  maxHeight?: number | string;
  /** Ref to the scroll area, e.g. for a virtualizer. */
  scrollRef?: Ref<HTMLDivElement>;
}

/**
 * DataTable.Table
 *
 * The scroll area plus the `Table` slot with header and body.
 *
 * @param props - See {@link DataTableTableProps}.
 *
 * @example
 * ```tsx
 * <DataTable.Provider data={data} columns={columns}>
 *   <DataTable.Root>
 *     <DataTable.Table maxHeight={400}>
 *       <tfoot><tr><td>Totals</td></tr></tfoot>
 *     </DataTable.Table>
 *   </DataTable.Root>
 * </DataTable.Provider>
 * ```
 */
export function DataTableTable({ children, body, maxHeight, scrollRef }: DataTableTableProps) {
  const { components: C, slotProps } = useDataTableContext();
  return (
    <div
      ref={scrollRef}
      className="rdt__scroll"
      style={maxHeight !== undefined ? { maxHeight } : undefined}
    >
      <C.Table {...slotProps.table}>
        <DataTableHead />
        {body ?? <DataTableBody />}
        {children}
      </C.Table>
    </div>
  );
}

/**
 * DataTable.Pagination
 *
 * The `Pagination` slot, fed from the table. Renders nothing when
 * `enablePagination` is `false`. The page-size options always include the
 * current page size.
 *
 * @example
 * ```tsx
 * <DataTable.Provider data={data} columns={columns}>
 *   <DataTable.Pagination />
 *   <DataTable.Table />
 * </DataTable.Provider>
 * ```
 */
export function DataTablePagination() {
  const { table, components: C, labels, paginationEnabled, pageSizeOptions } = useDataTableContext();
  if (!paginationEnabled) return null;

  const { pageIndex, pageSize } = table.state.pagination;
  const options = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <C.Pagination
      pageIndex={pageIndex}
      pageCount={Math.max(table.getPageCount(), 1)}
      pageSize={pageSize}
      pageSizeOptions={options}
      rowCount={table.getRowCount()}
      canPreviousPage={table.getCanPreviousPage()}
      canNextPage={table.getCanNextPage()}
      previousPage={() => table.previousPage()}
      nextPage={() => table.nextPage()}
      setPageIndex={(index) => table.setPageIndex(index)}
      setPageSize={(size) => table.setPageSize(size)}
      labels={labels}
    />
  );
}
