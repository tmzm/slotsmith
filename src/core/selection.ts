import type { RowSelectionState } from "@tanstack/react-table";

/** Builds TanStack's `{ [rowId]: true }` map from the selected rows. */
export function toRowSelection<T>(
  selection: readonly T[],
  getKey: (row: T) => string,
): RowSelectionState {
  const state: RowSelectionState = {};
  for (const row of selection) state[getKey(row)] = true;
  return state;
}

/**
 * Turns a new `{ [rowId]: true }` map back into rows.
 *
 * Rows the table doesn't currently hold (other server pages) are kept from the
 * previous selection, so selection survives manual pagination. Rows the table
 * does hold are taken from `rowsById`, keeping the order they were selected in.
 */
export function fromRowSelection<T>(
  next: RowSelectionState,
  rowsById: ReadonlyMap<string, T>,
  previous: readonly T[],
  getKey: (row: T) => string,
): T[] {
  const previousKeys = new Set(previous.map(getKey));

  const kept = previous.flatMap((row) => {
    const key = getKey(row);
    if (!rowsById.has(key)) return [row];
    return next[key] ? [rowsById.get(key) as T] : [];
  });
  const added = Object.keys(next)
    .filter((key) => next[key] && !previousKeys.has(key))
    .map((key) => rowsById.get(key))
    .filter((row): row is T => row !== undefined);

  return [...kept, ...added];
}

/**
 * Page to move to when the current page came back empty (e.g. its last row was
 * deleted), or `null` to stay. A negative `pageCount` means "unknown".
 */
export function stepBackPageIndex(pageIndex: number, pageCount: number): number | null {
  if (pageIndex <= 0) return null;
  if (pageCount < 0) return pageIndex - 1;
  return Math.max(0, Math.min(pageIndex - 1, pageCount - 1));
}
