import type { Key } from "react";

/**
 * Virtual range
 *
 * The rows in view, as a virtualizer hands them to a `rangeExtractor`.
 */
export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  overscan: number;
  count: number;
}

/**
 * Virtual row
 *
 * One windowed row: its index and where it sits in the scroll area.
 */
export interface VirtualRow {
  index: number;
  start: number;
  end: number;
  size: number;
  key: Key;
}

/**
 * Virtualizer
 *
 * What the windowed lists read from a virtualizer. TanStack Virtual's
 * `Virtualizer` has all of it.
 */
export interface Virtualizer {
  getVirtualItems(): VirtualRow[];
  getTotalSize(): number;
  scrollToIndex(index: number, options?: { align?: "start" | "center" | "end" | "auto" }): void;
  /** Every row's place, measured or estimated. */
  measurementsCache: VirtualRow[];
  /** How far the scroll area is scrolled. */
  scrollOffset: number | null;
}

/**
 * Virtualizer options
 *
 * What the windowed lists pass to a virtualizer hook.
 */
export interface VirtualizerOptions {
  count: number;
  getScrollElement: () => Element | null;
  estimateSize: (index: number) => number;
  overscan?: number;
  initialRect?: { width: number; height: number };
  getItemKey?: (index: number) => Key;
  rangeExtractor?: (range: VirtualRange) => number[];
}

/**
 * Use virtualizer
 *
 * A virtualizer hook: TanStack Virtual's `useVirtualizer` from
 * `@tanstack/react-virtual`. It is passed in (`virtual={{ use: useVirtualizer }}`)
 * rather than imported here, so an app that never windows a list does not
 * need the package, and the components' own entries never import it.
 *
 * @example
 * ```tsx
 * import { useVirtualizer } from "@tanstack/react-virtual";
 *
 * <DataTable data={rows} columns={columns} virtual={{ use: useVirtualizer, estimateSize: 36 }} />;
 * ```
 */
export type UseVirtualizer = (options: VirtualizerOptions) => Virtualizer;

/**
 * Default range extractor
 *
 * The rows in view plus `overscan` on each side, as TanStack Virtual's own.
 *
 * @param range - The range in view.
 * @returns The indexes to render, in order.
 */
export function defaultRangeExtractor(range: VirtualRange): number[] {
  const start = Math.max(range.startIndex - range.overscan, 0);
  const end = Math.min(range.endIndex + range.overscan, range.count - 1);
  const indexes: number[] = [];
  for (let index = start; index <= end; index++) indexes.push(index);
  return indexes;
}
