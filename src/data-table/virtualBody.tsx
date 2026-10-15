import type { RowData } from "@tanstack/react-table";
import { useEffect, useMemo, type ReactNode } from "react";
import { defaultRangeExtractor, type UseVirtualizer, type VirtualRange } from "../shared/virtualizer";
import { DataTableRowView, DataTableStatusRows, mergeProps, useColumnSpan } from "./parts";
import type { SectionSlotProps } from "./slots/types";
import { useDataTableContext } from "./slots/context";

/**
 * Virtual options
 *
 * How a windowed data table measures and renders its rows: the `virtual`
 * prop of `DataTable`.
 *
 * @example
 * ```tsx
 * import { useVirtualizer } from "@tanstack/react-virtual";
 *
 * <DataTable data={rows} columns={columns} virtual={{ use: useVirtualizer, estimateSize: 36, maxHeight: 600 }} />;
 * ```
 */
export interface DataTableVirtualOptions {
  /** The virtualizer hook: `useVirtualizer` from `@tanstack/react-virtual`. */
  use: UseVirtualizer;
  /** A row's height in px. Rows are not measured, so keep them this height. Defaults to 40. */
  estimateSize?: number;
  /** Rows rendered beyond the visible area. Defaults to 10. */
  overscan?: number;
  /** Height of the scroll area. Defaults to 480px. */
  maxHeight?: number | string;
}

/**
 * Default max height
 *
 * Height of the scroll area, in px, when `virtual.maxHeight` isn't set.
 */
export const DEFAULT_VIRTUAL_MAX_HEIGHT = 480;

/**
 * Spacer
 *
 * An empty full-width row standing in for rows outside the window.
 */
function Spacer({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true" data-slot="virtual-spacer">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

/** Where the scroll area's content starts, in viewport coordinates. */
const contentOrigin = (area: HTMLElement | null) =>
  area ? area.getBoundingClientRect().top - area.scrollTop : -window.scrollY;

/**
 * Virtual body props
 */
export interface DataTableVirtualBodyProps extends DataTableVirtualOptions {
  /**
   * The scroll area the rows scroll in. Pass the element itself (kept in
   * state via a callback ref), not a ref object: the body renders inside the
   * scroll area, so a ref object is still empty when the body first mounts.
   */
  scrollElement: HTMLElement | null;
}

/**
 * DataTable virtual body
 *
 * A body that renders only the rows in view. Spacer rows keep the native table
 * layout, so every `Row` / `Cell` slot works unchanged. Rows can be
 * reordered: the row being dragged stays rendered while it is scrolled out
 * of the window, and the drag reads every row's place from the virtualizer.
 *
 * @param props - See {@link DataTableVirtualBodyProps}.
 *
 * @example
 * ```tsx
 * function MyVirtualTable() {
 *   const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
 *   return (
 *     <DataTable.Provider data={rows} columns={columns} enablePagination={false}>
 *       <DataTable.Table
 *         scrollRef={setScrollElement}
 *         maxHeight={600}
 *         body={<DataTable.VirtualBody use={useVirtualizer} scrollElement={scrollElement} maxHeight={600} />}
 *       />
 *     </DataTable.Provider>
 *   );
 * }
 * ```
 */
export function DataTableVirtualBody<T extends RowData>({
  use: useVirtualizer,
  scrollElement,
  estimateSize = 40,
  overscan = 10,
  maxHeight = DEFAULT_VIRTUAL_MAX_HEIGHT,
}: DataTableVirtualBodyProps) {
  const { table, status, components: C, slotProps, reorder } = useDataTableContext<T>();
  const colSpan = useColumnSpan();
  const rows = table.getRowModel().rows;
  const indexById = useMemo(() => new Map(rows.map((row, index) => [row.id, index])), [rows]);

  /** The dragged row and its visible sub-rows, kept rendered wherever the window is. */
  const pinned = useMemo(() => {
    const start = reorder.draggingId === null ? undefined : indexById.get(reorder.draggingId);
    if (start === undefined) return [];
    const indexes = [start];
    for (let index = start + 1; index < rows.length && rows[index]!.depth > rows[start]!.depth; index++) {
      indexes.push(index);
    }
    return indexes;
  }, [reorder.draggingId, indexById, rows]);

  const virtualizer = useVirtualizer({
    count: status === "ready" ? rows.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    /** Render the first screen before the scroll area has been measured (also SSR). */
    initialRect: { width: 0, height: typeof maxHeight === "number" ? maxHeight : DEFAULT_VIRTUAL_MAX_HEIGHT },
    rangeExtractor: (range: VirtualRange) => {
      const indexes = defaultRangeExtractor(range);
      if (!pinned.length) return indexes;
      return Array.from(new Set([...indexes, ...pinned.filter((index) => index < range.count)])).sort((a, b) => a - b);
    },
  });

  /** Rows are a fixed height, so every row's place follows from the first rendered one. */
  const { setGeometry } = reorder;
  useEffect(() => {
    setGeometry({
      measure: (parent, area) => {
        const first = parent.querySelector<HTMLElement>(":scope > [data-row-id]");
        const firstIndex = first ? indexById.get(first.getAttribute("data-row-id") ?? "") : undefined;
        if (!first || firstIndex === undefined) return [];
        const top = first.getBoundingClientRect().top - contentOrigin(area) - firstIndex * estimateSize;
        return rows.map((row, index) => ({
          id: row.id,
          top: top + index * estimateSize,
          bottom: top + (index + 1) * estimateSize,
        }));
      },
      reveal: (id) => {
        const index = indexById.get(id);
        if (index !== undefined) virtualizer.scrollToIndex(index, { align: "auto" });
      },
    });
    return () => setGeometry(null);
  }, [setGeometry, rows, indexById, estimateSize, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const body: ReactNode[] = [];
  let end = 0;
  for (const item of items) {
    const row = rows[item.index];
    if (!row) continue;
    // A gap between rendered rows (the pinned dragged row) keeps the rows below in their place.
    if (item.start > end) body.push(<Spacer key={`gap-${item.index}`} height={item.start - end} colSpan={colSpan} />);
    body.push(<DataTableRowView key={row.id} row={row} />);
    end = item.end;
  }

  return (
    <C.Body {...mergeProps(reorder.getBodyProps() as SectionSlotProps, slotProps.body)}>
      {status === "ready" ? (
        <>
          {body}
          <Spacer height={virtualizer.getTotalSize() - end} colSpan={colSpan} />
        </>
      ) : (
        <DataTableStatusRows />
      )}
    </C.Body>
  );
}
