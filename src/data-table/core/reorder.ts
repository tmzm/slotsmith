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
 * What a drop reports. The table does not reorder itself: store `data`, or,
 * for a sub-row of a tree table, store `siblings` as the children of `parent`.
 * A row only ever moves among its siblings, together with its sub-rows.
 *
 * @typeParam T - The row data type.
 */
export interface RowOrderChange<T> {
  /** The row that was moved. */
  row: T;
  rowId: string;
  /** The row it was dropped next to: always one of its siblings. */
  target: T;
  targetId: string;
  /** Which side of the target it landed on. */
  position: DropPosition;
  /**
   * The top-level rows: `data` with the row moved when it is a top-level row,
   * `data` unchanged when it is a sub-row (store `siblings` then).
   */
  data: T[];
  /** The id of the moved row's parent; `null` for a top-level row. */
  parentId: string | null;
  /** The moved row's parent; `null` for a top-level row. */
  parent: T | null;
  /** The parent's children in their new order; for a top-level row, the same rows as `data`. */
  siblings: T[];
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

/** Where a visible row sits in a tree. Every row of a flat table is top-level at depth zero. */
export interface RowLevel {
  id: string;
  /** The parent row's id; `null` at the top level. */
  parentId: string | null;
  depth: number;
}

/**
 * Row block
 *
 * A sibling of the dragged row together with its visible descendants: the
 * unit that moves, makes room and is targeted in a tree. `id` is the
 * sibling's, `top` and `bottom` span the whole block, `ids` lists its rows
 * from the sibling down.
 */
export interface RowBlock extends RowRect {
  ids: string[];
}

/**
 * Sibling blocks
 *
 * The rows a row can move among, each grown to cover its expanded subtree:
 * a block runs from a sibling to the next visible row at its depth or
 * shallower. Treating each block as one rect lets {@link dropTargetAt},
 * {@link stepTarget}, {@link landingIndex} and {@link rowOffsets} work on a
 * tree unchanged. In a flat table every block is one row.
 *
 * @param rows - The visible rows, top to bottom.
 * @param rects - Their extents, by id.
 * @param draggingId - The row being moved.
 * @returns The dragged row's siblings (itself included) as blocks, top to
 *   bottom; empty when the row is not rendered.
 */
export function siblingBlocks(
  rows: readonly RowLevel[],
  rects: readonly RowRect[],
  draggingId: string,
): RowBlock[] {
  const dragged = rows.find((row) => row.id === draggingId);
  if (!dragged) return [];
  const rectOf = new Map(rects.map((rect) => [rect.id, rect]));
  const blocks: RowBlock[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (row.depth !== dragged.depth || row.parentId !== dragged.parentId) continue;
    const ids = [row.id];
    while (index + 1 < rows.length && rows[index + 1]!.depth > row.depth) ids.push(rows[++index]!.id);
    const first = rectOf.get(ids[0]!);
    const last = rectOf.get(ids[ids.length - 1]!);
    if (first && last) blocks.push({ id: row.id, top: first.top, bottom: last.bottom, ids });
  }
  return blocks;
}

/**
 * Block row offsets
 *
 * Spreads offsets computed per block (by {@link rowOffsets} over blocks) to
 * every row of each block, so a block slides and travels as one piece.
 *
 * @param blocks - The blocks, from {@link siblingBlocks}.
 * @param offsets - Offsets by block id.
 * @returns Offsets by row id. Rows of blocks that do not move are absent.
 */
export function blockRowOffsets(
  blocks: readonly RowBlock[],
  offsets: ReadonlyMap<string, number>,
): Map<string, number> {
  const rows = new Map<string, number>();
  for (const block of blocks) {
    const offset = offsets.get(block.id);
    if (offset === undefined) continue;
    for (const id of block.ids) rows.set(id, offset);
  }
  return rows;
}

/**
 * Can reorder
 *
 * The one place that decides whether rows can be dragged. Sorting is
 * deliberately not part of it: a drop reorders the data even while the view is
 * sorted by a column. A tree is not part of it either: its rows move among
 * their siblings.
 *
 * @param state - What the table is doing.
 * @returns Whether dragging is on.
 */
export function canReorder(state: { enabled: boolean; virtual: boolean; rowCount: number }): boolean {
  // TODO(reorder-sorting): decide what a drop means while a column sort is active (block it, or clear the sort).
  return state.enabled && !state.virtual && state.rowCount > 1;
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
