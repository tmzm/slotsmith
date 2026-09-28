/** Which side of a row another row is dropped on. */
export type DropPosition = "before" | "after";

/** A place to drop: a row and a side of it. */
export interface DropTarget {
  id: string;
  position: DropPosition;
}

/** A rendered row's vertical extent, in viewport coordinates. */
export interface RowRect {
  id: string;
  top: number;
  bottom: number;
}

/**
 * Row order change
 *
 * What a drop reports. The table does not reorder itself: store `data`.
 *
 * @typeParam T - The row data type.
 */
export interface RowOrderChange<T> {
  /** The row that was moved. */
  row: T;
  rowId: string;
  /** The row it was dropped next to. */
  target: T;
  targetId: string;
  /** Which side of the target it landed on. */
  position: DropPosition;
  /** `data` with the row moved. */
  data: T[];
}

/**
 * Move an item
 *
 * @param items - The list.
 * @param from - Index of the item to move.
 * @param to - Index of the item to drop it next to.
 * @param position - Which side of that item.
 * @returns A new list. Equal to the input when the move changes nothing or an index is out of range.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number, position: DropPosition): T[] {
  const next = items.slice();
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return next;
  const [moved] = next.splice(from, 1);
  // Removing the item shifts everything after it up by one.
  const target = from < to ? to - 1 : to;
  next.splice(position === "before" ? target : target + 1, 0, moved as T);
  return next;
}

/**
 * Drop target at a height
 *
 * @param rects - The rendered rows, top to bottom.
 * @param y - The pointer's vertical position, in the same coordinates.
 * @returns The row under the pointer and the half it is in; the first or last
 *   row when the pointer is beyond the list; `null` with no rows.
 */
export function dropTargetAt(rects: readonly RowRect[], y: number): DropTarget | null {
  for (const rect of rects) {
    if (y < rect.bottom) return { id: rect.id, position: y < (rect.top + rect.bottom) / 2 ? "before" : "after" };
  }
  const last = rects[rects.length - 1];
  return last ? { id: last.id, position: "after" } : null;
}

/**
 * Landing index
 *
 * @param ids - The visible rows, in order.
 * @param draggingId - The row being moved.
 * @param target - Where it would be dropped.
 * @returns The index the row would have among the visible rows, from zero.
 */
export function landingIndex(ids: readonly string[], draggingId: string, target: DropTarget): number {
  const rest = ids.filter((id) => id !== draggingId);
  const index = rest.indexOf(target.id);
  return target.position === "before" ? index : index + 1;
}

/**
 * Step the target
 *
 * Moves a keyboard drag one row up or down.
 *
 * @param ids - The visible rows, in order.
 * @param draggingId - The row being moved.
 * @param current - The current target; `null` while the row is still in its own place.
 * @param step - `-1` for up, `1` for down.
 * @returns The new target; `null` when the row is back in its own place or cannot move.
 */
export function stepTarget(
  ids: readonly string[],
  draggingId: string,
  current: DropTarget | null,
  step: -1 | 1,
): DropTarget | null {
  const origin = ids.indexOf(draggingId);
  if (origin < 0 || ids.length < 2) return null;

  const rest = ids.filter((id) => id !== draggingId);
  const at = current ? landingIndex(ids, draggingId, current) : origin;
  const next = Math.min(Math.max(at + step, 0), rest.length);

  if (next === origin) return null;
  return next === 0
    ? { id: rest[0]!, position: "before" }
    : { id: rest[next - 1]!, position: "after" };
}

/**
 * Row offsets
 *
 * How far each row is drawn from its resting place while a row is being
 * moved: the rows it passes make room by its height, and the row itself
 * travels the combined height of the rows it passed.
 *
 * @param rects - The rows at rest, top to bottom.
 * @param draggingId - The row being moved.
 * @param target - Where it would be dropped.
 * @returns Vertical offsets in pixels, by row id. Rows that do not move are absent.
 */
export function rowOffsets(
  rects: readonly RowRect[],
  draggingId: string,
  target: DropTarget | null,
): Map<string, number> {
  const offsets = new Map<string, number>();
  const ids = rects.map((rect) => rect.id);
  const origin = ids.indexOf(draggingId);
  if (origin < 0 || !target) return offsets;

  const height = (index: number) => rects[index]!.bottom - rects[index]!.top;
  const landing = landingIndex(ids, draggingId, target);
  let travelled = 0;

  for (let index = origin + 1; index <= landing; index++) {
    offsets.set(ids[index]!, -height(origin));
    travelled += height(index);
  }
  for (let index = landing; index < origin; index++) {
    offsets.set(ids[index]!, height(origin));
    travelled -= height(index);
  }

  offsets.set(draggingId, travelled);
  return offsets;
}

/**
 * Can reorder
 *
 * The one place that decides whether rows can be dragged. Sorting is
 * deliberately not part of it: a drop reorders the data even while the view is
 * sorted by a column.
 *
 * @param state - What the table is doing.
 * @returns Whether dragging is on.
 */
export function canReorder(state: {
  enabled: boolean;
  hasSubRows: boolean;
  virtual: boolean;
  rowCount: number;
}): boolean {
  // TODO(reorder-sorting): decide what a drop means while a column sort is active (block it, or clear the sort).
  return state.enabled && !state.hasSubRows && !state.virtual && state.rowCount > 1;
}

/**
 * Scroll speed
 *
 * How fast to scroll while the pointer is near an edge of the scroll area.
 *
 * @param y - The pointer's vertical position.
 * @param top - The top edge of the scroll area.
 * @param bottom - The bottom edge of the scroll area.
 * @param edge - How close to an edge scrolling starts. Defaults to `40`.
 * @param max - The fastest speed, in pixels per frame. Defaults to `16`.
 * @returns Pixels per frame: negative for up, positive for down, zero away from the edges.
 */
export function scrollSpeed(y: number, top: number, bottom: number, edge = 40, max = 16): number {
  if (y < top + edge) return -Math.min(max, Math.ceil(((top + edge - y) / edge) * max));
  if (y > bottom - edge) return Math.min(max, Math.ceil(((y - (bottom - edge)) / edge) * max));
  return 0;
}
