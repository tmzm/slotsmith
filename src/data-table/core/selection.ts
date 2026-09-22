import type { RowSelectionState } from "@tanstack/react-table";

/**
 * To row selection
 *
 * Builds TanStack's `{ [rowId]: true }` map from the selected rows.
 *
 * @param selection - The selected rows.
 * @param getKey - Returns a row's id.
 * @returns The row selection map.
 *
 * @example
 * ```ts
 * toRowSelection([{ id: "a" }, { id: "c" }], (row) => row.id); // { a: true, c: true }
 * ```
 */
export function toRowSelection<T>(
  selection: readonly T[],
  getKey: (row: T) => string,
): RowSelectionState {
  const state: RowSelectionState = {};
  for (const row of selection) state[getKey(row)] = true;
  return state;
}

/**
 * From row selection
 *
 * Turns a new `{ [rowId]: true }` map back into rows. Rows the table doesn't
 * currently hold (other server pages) are kept from the previous selection, so
 * selection survives manual pagination. Rows the table does hold are taken
 * from `rowsById`, keeping the order they were selected in.
 *
 * @param next - The new row selection map.
 * @param rowsById - Every row the table currently holds, by id.
 * @param previous - The previous selection.
 * @param getKey - Returns a row's id.
 * @returns The new selection.
 *
 * @example
 * ```ts
 * const page = new Map([["a", a], ["b", b]]);
 * fromRowSelection({ z: true, b: true }, page, [z], getId); // [z, b]
 * ```
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
 * Step back page index
 *
 * The page to move to when the current page came back empty (e.g. its last
 * row was deleted).
 *
 * @param pageIndex - The current page index.
 * @param pageCount - The page count, or a negative number when unknown.
 * @returns The page index to move to, or `null` to stay.
 *
 * @example
 * ```ts
 * stepBackPageIndex(2, 2); // 1
 * stepBackPageIndex(0, 3); // null
 * ```
 */
export function stepBackPageIndex(pageIndex: number, pageCount: number): number | null {
  if (pageIndex <= 0) return null;
  if (pageCount < 0) return pageIndex - 1;
  return Math.max(0, Math.min(pageIndex - 1, pageCount - 1));
}
