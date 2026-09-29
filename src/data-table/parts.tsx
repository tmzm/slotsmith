import { flexRender, type RowData } from "@tanstack/react-table";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import type { DataTableColumnMeta, DataTableRow } from "./core/features";
import { DataTableRowContext, useDataTableContext, useDataTableRow } from "./slots/context";
import { classes } from "./classes";
import { cx } from "./slots/fallbacks";
import type { DragHandleSlotProps } from "./slots/types";

type AnyProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

/**
 * Merge props
 *
 * Merges two prop objects the way slot props are merged: classNames are
 * joined, styles merged, event handlers (`on*`) chained, base first, so
 * neither side's is lost, and anything else in `extra` wins. Chaining matters
 * most for the drag handle, whose key, pointer and blur handlers are the
 * reorder engine itself.
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
  };
  for (const key of Object.keys(b)) {
    const first = a[key];
    const second = b[key];
    if (key.startsWith("on") && typeof first === "function" && typeof second === "function") {
      merged[key] = (...args: unknown[]) => {
        (first as (...a: unknown[]) => void)(...args);
        (second as (...a: unknown[]) => void)(...args);
      };
    } else if (second === undefined && first !== undefined && key.startsWith("on")) {
      // An explicit `onX: undefined` keeps the base handler, as `onClick` always did.
      merged[key] = first;
    }
  }
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
 * Visually hidden
 *
 * Inline as well as in the stylesheet (`sdt__sr-only`), so hidden text stays out
 * of sight in an app that styles the table with its own components and no
 * `styles.css`.
 */
const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * useColumnSpan
 *
 * The number of cells a full-width row must span, counting the drag-handle
 * and checkbox columns.
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
  const { table, selectable, reorderHandleColumn } = useDataTableContext();
  return table.getAllLeafColumns().length + (selectable ? 1 : 0) + (reorderHandleColumn ? 1 : 0);
}

/**
 * DataTable.Head
 *
 * The `Head` slot with a `HeaderRow` per header group: an empty cell over the
 * drag handles when rows can be reordered, the select-all checkbox, then a `HeaderCell` per column with its `SortTrigger` when sortable.
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
  const { table, components: C, labels, slotProps, selectable, reorderHandleColumn } = useDataTableContext();
  const pageRows = table.getRowModel().rows;

  return (
    <C.Head {...slotProps.head}>
      {table.getHeaderGroups().map((headerGroup, groupIndex) => (
        <C.HeaderRow key={headerGroup.id} {...slotProps.headerRow}>
          {reorderHandleColumn && groupIndex === 0 && (
            <C.HeaderCell
              className={classes.cellDrag}
              rowSpan={table.getHeaderGroups().length}
              data-slot="drag"
            >
              {/* A header cell needs a name for the column it heads; sighted users see the grips. */}
              <span className={classes.srOnly} style={VISUALLY_HIDDEN}>
                {labels.reorderRow}
              </span>
            </C.HeaderCell>
          )}

          {selectable &&
            (groupIndex === 0 ? (
              <C.HeaderCell
                className={classes.cellSelect}
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
 * DataTable.Foot
 *
 * The `Foot` slot: a `<tfoot>` built from each column's `footer`, the same way
 * the head is built from `header`. Renders nothing when no column defines one,
 * so tables without totals stay exactly as they were.
 *
 * @example
 * ```tsx
 * const columns: DataTableColumnDef<Order>[] = [
 *   { accessorKey: "item", header: "Item", footer: "Total" },
 *   {
 *     accessorKey: "amount",
 *     header: "Amount",
 *     footer: ({ table }) =>
 *       table.getRowModel().rows.reduce((sum, row) => sum + row.original.amount, 0),
 *   },
 * ];
 * ```
 */
export function DataTableFoot() {
  const { table, components: C, slotProps, selectable, reorderHandleColumn } = useDataTableContext();
  const hasFooter = table.getAllLeafColumns().some((column) => column.columnDef.footer != null);
  if (!hasFooter) return null;

  return (
    <C.Foot {...slotProps.foot}>
      {table.getFooterGroups().map((footerGroup, groupIndex) => (
        <C.FooterRow key={footerGroup.id} {...slotProps.footerRow}>
          {reorderHandleColumn && groupIndex === 0 && (
            <C.FooterCell
              className={classes.cellDrag}
              rowSpan={table.getFooterGroups().length}
              data-slot="drag"
            />
          )}

          {selectable && groupIndex === 0 && (
            <C.FooterCell
              className={classes.cellSelect}
              rowSpan={table.getFooterGroups().length}
              data-slot="select"
            />
          )}

          {footerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta;
            return (
              <C.FooterCell
                key={header.id}
                {...mergeProps(
                  {
                    colSpan: header.colSpan > 1 ? header.colSpan : undefined,
                    className: meta?.cellClassName,
                    style: alignStyle(meta),
                    "data-align": meta?.align,
                  } as HTMLAttributes<HTMLTableCellElement>,
                  slotProps.footerCell?.(header),
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.footer, header.getContext())}
              </C.FooterCell>
            );
          })}
        </C.FooterRow>
      ))}
    </C.Foot>
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
 * One body row: the `Row` slot with its drag-handle and checkbox cells and a
 * `Cell` per column, the first one indented and holding the `ExpandToggle` in
 * tree tables. Provides the row to `useDataTableRow()`. The row carries
 * `data-row-id`, and during a drag `data-dragging` (the moved row),
 * `data-dragging-child` (its visible sub-rows, which move with it),
 * `data-drop-position` (the target) and `data-drop-edge` (where to draw a drop line).
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
  const { components: C, labels, slotProps, selectable, expandable, onRowClick, reorder, reorderHandleColumn } =
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
      ...reorder.getRowProps(row.id),
    } as HTMLAttributes<HTMLTableRowElement>,
    slotProps.row?.(row),
  );

  return (
    <DataTableRowContext.Provider value={row as unknown as DataTableRow<any>}>
      <C.Row {...rowProps}>
        {reorderHandleColumn && (
          <C.Cell className={classes.cellDrag} data-slot="drag">
            <C.DragHandle {...mergeProps(reorder.getHandleProps(row.id), slotProps.dragHandle?.(row))} />
          </C.Cell>
        )}

        {selectable && (
          <C.Cell className={classes.cellSelect} data-slot="select">
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
                className={classes.tree}
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
                  <span className={classes.treeSpacer} aria-hidden="true" />
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
 * DataTable.DragHandle
 *
 * The handle that reorders the row it is rendered in. The table adds one in a
 * leading column on its own; use this to place it in a cell of your own, with
 * `reorderHandleColumn={false}`. Renders nothing outside a row or when
 * reordering is off, and a disabled handle while too few rows show to move.
 *
 * @param props - Extra handle props, layered over the table's and `slotProps.dragHandle`.
 *
 * @example
 * ```tsx
 * { id: "move", header: "", cell: () => <DataTable.DragHandle /> }
 * ```
 */
export function DataTableDragHandle(props: Partial<DragHandleSlotProps>) {
  const { components: C, reorder, reorderable, slotProps } = useDataTableContext();
  const row = useDataTableRow();
  if (!row || !reorderable) return null;
  return (
    <C.DragHandle
      {...mergeProps(mergeProps(reorder.getHandleProps(row.id), slotProps.dragHandle?.(row)), props)}
    />
  );
}

/**
 * Reorder announcer
 *
 * The live region that reads each step of a row drag aloud, and the hidden
 * instructions every drag handle's `aria-describedby` points at. Rendered by
 * `DataTable.Root`; renders nothing unless rows can be reordered. Both stay
 * mounted while reordering is on, because a live region added at the moment
 * it changes is not announced.
 *
 * @internal
 */
export function DataTableReorderAnnouncer() {
  const { reorder, reorderable, labels } = useDataTableContext();
  if (!reorderable) return null;
  return (
    <>
      <div role="status" aria-live="assertive" aria-atomic="true" className={classes.srOnly} style={VISUALLY_HIDDEN}>
        {reorder.announcement}
      </div>
      <div id={reorder.instructionsId} hidden>
        {labels.reorderInstructions}
      </div>
    </>
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
      className={classes.scroll}
      style={maxHeight !== undefined ? { maxHeight } : undefined}
    >
      <C.Table {...slotProps.table}>
        <DataTableHead />
        {body ?? <DataTableBody />}
        <DataTableFoot />
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
