import type { RowData } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type RefObject } from "react";
import {
  DataTableProvider,
  DataTableRoot,
  splitDataTableProps,
  type DataTableProps,
} from "./DataTable";
import {
  DataTablePagination,
  DataTableRowView,
  DataTableStatusRows,
  DataTableTable,
  useColumnSpan,
} from "./parts";
import { useDataTableContext } from "./slots/context";

export interface VirtualOptions {
  /** Estimated row height in px. Defaults to 40. */
  estimateSize?: number;
  /** Rows rendered beyond the visible area. Defaults to 10. */
  overscan?: number;
  /** Height of the scroll area. Defaults to 480px. */
  maxHeight?: number | string;
}

const DEFAULT_MAX_HEIGHT = 480;

function Spacer({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true" data-slot="virtual-spacer">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

/**
 * A body that renders only the rows in view. Spacer rows keep the native table
 * layout, so every `Row` / `Cell` slot works unchanged.
 */
export function DataTableVirtualBody({
  scrollRef,
  estimateSize = 40,
  overscan = 10,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: { scrollRef: RefObject<HTMLDivElement | null> } & VirtualOptions) {
  const { table, status, components: C, slotProps } = useDataTableContext();
  const colSpan = useColumnSpan();
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: status === "ready" ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
    // Render the first screen before the scroll area has been measured (also SSR).
    initialRect: { width: 0, height: typeof maxHeight === "number" ? maxHeight : DEFAULT_MAX_HEIGHT },
  });

  const items = virtualizer.getVirtualItems();
  const before = items[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0);

  return (
    <C.Body {...slotProps.body}>
      {status === "ready" ? (
        <>
          <Spacer height={before} colSpan={colSpan} />
          {items.map((item) => {
            const row = rows[item.index]!;
            return <DataTableRowView key={row.id} row={row} />;
          })}
          <Spacer height={after} colSpan={colSpan} />
        </>
      ) : (
        <DataTableStatusRows />
      )}
    </C.Body>
  );
}

export interface VirtualDataTableProps<T extends RowData> extends DataTableProps<T> {
  virtual?: VirtualOptions;
}

/**
 * `<DataTable>` for long lists: rows are virtualized and the header is sticky.
 * Pagination is off by default (`enablePagination` turns it back on).
 */
export function VirtualDataTable<T extends RowData>(props: VirtualDataTableProps<T>) {
  const { providerProps, rest } = splitDataTableProps<T, VirtualDataTableProps<T>>(props);
  const { virtual = {}, size = "sm", footer, hidePagination, ...htmlProps } = rest;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <DataTableProvider enablePagination={false} {...providerProps}>
      <DataTableRoot size={size} data-virtual="" {...htmlProps}>
        <DataTableTable
          scrollRef={scrollRef}
          maxHeight={virtual.maxHeight ?? DEFAULT_MAX_HEIGHT}
          body={
            <DataTableVirtualBody
              scrollRef={scrollRef}
              estimateSize={virtual.estimateSize}
              overscan={virtual.overscan}
              maxHeight={virtual.maxHeight}
            />
          }
        />
        {footer}
        {!hidePagination && <DataTablePagination />}
      </DataTableRoot>
    </DataTableProvider>
  );
}
