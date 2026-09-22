import { flexRender, type RowData } from "@tanstack/react-table";
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import type { DataTableColumnMeta, DataTableRow } from "./core/features";
import { DataTableRowContext, useDataTableContext } from "./slots/context";
import { cx } from "./slots/fallbacks";

type AnyProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

/** Joins classNames, merges styles and chains onClick; everything else in `extra` wins. */
export function mergeProps<P extends object>(base: P, extra?: Partial<P>): P {
  if (!extra) return base;
  const a = base as AnyProps;
  const b = extra as AnyProps;
  return {
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
  } as P;
}

const alignStyle = (meta?: DataTableColumnMeta): CSSProperties | undefined =>
  meta?.align ? { textAlign: meta.align } : undefined;

/** Number of `<td>`s a full-width row must span. */
export function useColumnSpan() {
  const { table, selectable } = useDataTableContext();
  return table.getAllLeafColumns().length + (selectable ? 1 : 0);
}

/* -------------------------------------------------------------------- head */

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

/* --------------------------------------------------------------------- row */

const INDENT_REM = 1.25;

export function DataTableRowView<T extends RowData>({
  row,
  style,
}: {
  row: DataTableRow<T>;
  /** Extra style, e.g. from a virtualizer. */
  style?: CSSProperties;
}) {
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

/* ------------------------------------------------------------ status rows */

/** Loading skeleton, error or empty rows; `null` when there are rows to show. */
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

/* -------------------------------------------------------------------- body */

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

/* ------------------------------------------------------------------- table */

export interface DataTableTableProps {
  /** Extra content inside the table, after the body (e.g. a `<tfoot>`). */
  children?: ReactNode;
  /** Replaces the default body (used by the virtual entry). */
  body?: ReactNode;
  /** Caps the scroll area's height; the header stays sticky. */
  maxHeight?: number | string;
  scrollRef?: Ref<HTMLDivElement>;
}

/** The scroll area plus the `Table` slot with header and body. */
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

/* -------------------------------------------------------------- pagination */

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
