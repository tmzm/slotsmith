/**
 * Cell edit
 *
 * One cell's value before and after a change, as recorded for undo.
 *
 * @typeParam V - The values' type.
 */
export interface CellEdit<V> {
  rowId: string;
  columnId: string;
  before: V;
  after: V;
}

/**
 * History
 *
 * The undo and redo stacks: each entry is every cell one change wrote.
 *
 * @typeParam V - The values' type.
 */
export interface History<V> {
  past: readonly (readonly CellEdit<V>[])[];
  future: readonly (readonly CellEdit<V>[])[];
}

/** An empty history. */
export const emptyHistory = <V>(): History<V> => ({ past: [], future: [] });

/**
 * Record
 *
 * Adds a change to the history. Redo is cleared, as in every editor, and
 * the oldest change is dropped past `limit`.
 *
 * @returns The new history; unchanged when the change is empty or `limit` is zero.
 */
export function record<V>(history: History<V>, change: readonly CellEdit<V>[], limit: number): History<V> {
  if (change.length === 0 || limit <= 0) return history;
  const past = [...history.past, change];
  return { past: past.length > limit ? past.slice(past.length - limit) : past, future: [] };
}

/** A change turned around: each cell goes back to its value before. */
const invert = <V>(change: readonly CellEdit<V>[]): CellEdit<V>[] =>
  change.map((edit) => ({ ...edit, before: edit.after, after: edit.before }));

/**
 * Undo
 *
 * @returns The new history and the cells to write (each back to its value
 *   before the last change); `null` when there is nothing to undo.
 */
export function undo<V>(history: History<V>): { history: History<V>; change: CellEdit<V>[] } | null {
  const last = history.past[history.past.length - 1];
  if (!last) return null;
  return {
    history: { past: history.past.slice(0, -1), future: [...history.future, last] },
    change: invert(last),
  };
}

/**
 * Redo
 *
 * @returns The new history and the cells to write again; `null` when there is nothing to redo.
 */
export function redo<V>(history: History<V>): { history: History<V>; change: CellEdit<V>[] } | null {
  const next = history.future[history.future.length - 1];
  if (!next) return null;
  return {
    history: { past: [...history.past, next], future: history.future.slice(0, -1) },
    change: next.map((edit) => ({ ...edit })),
  };
}
