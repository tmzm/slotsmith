/** Which side of a row another row is dropped on. */
export type DropPosition = "before" | "after";

/**
 * Drop place
 *
 * Where a dropped row lands against its target: before or after it, or,
 * when rows move across parents, inside it as a child.
 */
export type DropPlace = DropPosition | "inside";

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
 * A row moves together with its sub-rows, among its siblings, or, with
 * `reorderAcrossParents`, to another parent: `data` is then the whole new tree.
 *
 * @typeParam T - The row data type.
 */
export interface RowOrderChange<T> {
  /** The row that was moved. */
  row: T;
  rowId: string;
  /**
   * Every row that moved, in their new order: the dragged row alone, or, when
   * it was dragged among other selected rows, all the selected siblings.
   */
  rows: T[];
  rowIds: string[];
  /** The row it was dropped next to (one of its new siblings), or, for `"inside"`, its new parent. */
  target: T;
  targetId: string;
  /** Which side of the target it landed on, or `"inside"` it. */
  position: DropPlace;
  /**
   * The top-level rows: `data` with the row moved when it is a top-level row,
   * `data` unchanged when it is a sub-row (store `siblings` then). After a
   * move to another parent, the whole new tree, built with `setSubRows`.
   */
  data: T[];
  /** The id of the moved row's parent after the move; `null` for the top level. */
  parentId: string | null;
  /** The moved row's parent after the move; `null` for the top level. */
  parent: T | null;
  /** The parent's children in their new order; for a top-level row, the same rows as `data`. */
  siblings: T[];
  /** The row's index among `siblings`. */
  index: number;
  /** The id of the parent the row came from; the same as `parentId` unless it moved across parents. */
  fromParentId: string | null;
  /** The parent the row came from. */
  fromParent: T | null;
}

/**
 * Row move
 *
 * A place a row could be dropped, as `canDrop` sees it.
 *
 * @typeParam T - The row data type.
 */
export interface RowMove<T> {
  /** The row being moved. */
  row: T;
  rowId: string;
  /** The parent it would have; `null` for the top level. */
  parent: T | null;
  parentId: string | null;
  /** Its index among the parent's children. */
  index: number;
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
 * The one place that decides whether rows can be dragged. A tree is not part
 * of it: its rows move among their siblings. While a column sort is active,
 * `reorderWhileSorted` decides: `"block"` turns dragging off, and
 * `"clearSort"` (the default) leaves it on and clears the sort on a drop.
 *
 * @param state - What the table is doing.
 * @returns Whether dragging is on.
 */
export function canReorder(state: {
  enabled: boolean;
  rowCount: number;
  sorted?: boolean;
  whileSorted?: ReorderWhileSorted;
}): boolean {
  if (state.sorted && state.whileSorted === "block") return false;
  return state.enabled && state.rowCount > 1;
}

/**
 * Reorder while sorted
 *
 * What a drop means while a column sort is active. `"clearSort"`: the drop
 * reorders the data and the sort is cleared, so the new order shows.
 * `"block"`: the handles are disabled until the sort is cleared.
 */
export type ReorderWhileSorted = "clearSort" | "block";

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

/**
 * Placement
 *
 * Where a row lands in a tree: under a parent, at an index among the
 * parent's other children, at a depth.
 */
export interface Placement {
  /** The new parent's id; `null` for the top level. */
  parentId: string | null;
  /** The index among the parent's children, the moved row left out. */
  index: number;
  depth: number;
}

/**
 * Depth range
 *
 * The depths a row may land at in a gap of the visible rows (the moved rows
 * left out): no shallower than the row below, which must not end up inside
 * it, and at most one deeper than the row above, as its child.
 *
 * @param above - The row above the gap, if any.
 * @param below - The row below the gap, if any.
 * @returns The shallowest and the deepest depth allowed.
 */
export function depthRange(above: RowLevel | undefined, below: RowLevel | undefined): { min: number; max: number } {
  return { min: below ? below.depth : 0, max: above ? above.depth + 1 : 0 };
}

/**
 * Placement at
 *
 * Turns a gap and a depth into a placement in the tree.
 *
 * @param rows - The visible rows, top to bottom, the moved rows left out.
 * @param gap - The gap, from 0 (above the first row) to `rows.length` (below the last).
 * @param depth - The depth, within {@link depthRange}.
 * @param childrenOf - Every child id of a parent (`null` for the top level), in
 *   the data's order, the moved row left out.
 * @returns The placement.
 */
export function placementAt(
  rows: readonly RowLevel[],
  gap: number,
  depth: number,
  childrenOf: (parentId: string | null) => readonly string[],
): Placement {
  const above = rows[gap - 1];
  const below = rows[gap];
  if (above && depth === above.depth + 1) {
    // A child of the row above: before its first shown child, or last among hidden ones.
    const children = childrenOf(above.id);
    const index = below && below.depth === depth ? children.indexOf(below.id) : children.length;
    return { parentId: above.id, index: Math.max(index, 0), depth };
  }
  if (below && below.depth === depth) {
    return { parentId: below.parentId, index: Math.max(childrenOf(below.parentId).indexOf(below.id), 0), depth };
  }
  // After the row above's ancestor at this depth.
  let anchor = above;
  while (anchor && anchor.depth > depth) anchor = rows.find((row) => row.id === anchor!.parentId);
  const parentId = anchor ? anchor.parentId : null;
  const index = anchor ? childrenOf(parentId).indexOf(anchor.id) + 1 : 0;
  return { parentId, index, depth };
}

/**
 * Tree node
 *
 * A row of a tree with its children, as TanStack's rows have them.
 *
 * @typeParam T - The row data type.
 */
export interface TreeNode<T> {
  id: string;
  original: T;
  subRows?: readonly TreeNode<T>[];
}

/**
 * Move in tree
 *
 * The rows with one row (and its whole subtree) moved to a placement. Only the
 * rows on the way to the old and the new parent are copied, with
 * `setSubRows`; the rest are kept as they are.
 *
 * @typeParam T - The row data type.
 * @param roots - The top-level rows.
 * @param rowId - The row to move.
 * @param to - Where it goes.
 * @param setSubRows - Writes new children into a copy of a row.
 * @returns The new top-level rows.
 */
export function moveInTree<T>(
  roots: readonly TreeNode<T>[],
  rowId: string,
  to: { parentId: string | null; index: number },
  setSubRows: (row: T, subRows: T[]) => T,
): T[] {
  let moving: TreeNode<T> | undefined;
  const touched = new Set<string>();
  /** Marks the nodes on the way to `id`, and returns whether it is in `nodes`. */
  const mark = (nodes: readonly TreeNode<T>[], id: string, path: string[]): boolean => {
    for (const node of nodes) {
      if (node.id === id) {
        if (id === rowId) moving = node;
        for (const step of path) touched.add(step);
        touched.add(node.id);
        return true;
      }
      if (node.subRows && mark(node.subRows, id, [...path, node.id])) return true;
    }
    return false;
  };
  mark(roots, rowId, []);
  if (to.parentId !== null) mark(roots, to.parentId, []);
  if (!moving) return roots.map((node) => node.original);

  const build = (nodes: readonly TreeNode<T>[], parentId: string | null): T[] => {
    const list = nodes
      .filter((node) => node.id !== rowId)
      .map((node) => {
        if (!touched.has(node.id) || node.id === rowId) return node.original;
        const children = build(node.subRows ?? [], node.id);
        const before = (node.subRows ?? []).map((child) => child.original);
        const same = children.length === before.length && children.every((child, i) => child === before[i]);
        return same ? node.original : setSubRows(node.original, children);
      });
    if (parentId === to.parentId) list.splice(Math.min(to.index, list.length), 0, moving!.original);
    return list;
  };
  return build(roots, null);
}

/**
 * Layout offsets
 *
 * Where each row is drawn when blocks are laid out in another order, packed
 * from the first block's top: the offset of each row from its place at rest.
 *
 * @param blocks - The blocks at rest, top to bottom.
 * @param order - Every block's id, in the order to draw them.
 * @returns Offsets in pixels, by row id; rows that stay put are absent.
 */
export function layoutOffsets(blocks: readonly RowBlock[], order: readonly string[]): Map<string, number> {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const offsets = new Map<string, number>();
  let top = blocks[0]?.top ?? 0;
  for (const id of order) {
    const block = byId.get(id);
    if (!block) continue;
    const offset = top - block.top;
    if (offset !== 0) for (const row of block.ids) offsets.set(row, offset);
    top += block.bottom - block.top;
  }
  return offsets;
}

/**
 * Group order
 *
 * The blocks' order with a group of them taken out and put back together at
 * a gap among the rest, in their own order.
 *
 * @param ids - Every block's id, in order.
 * @param group - The ids that move together.
 * @param gap - Where they go among the other ids, from 0 to their count.
 * @returns The new order.
 */
export function groupOrder(ids: readonly string[], group: readonly string[], gap: number): string[] {
  const moving = new Set(group);
  const rest = ids.filter((id) => !moving.has(id));
  const together = ids.filter((id) => moving.has(id));
  return [...rest.slice(0, gap), ...together, ...rest.slice(gap)];
}
