/**
 * Cell position
 *
 * A cell by ids, so it stays the same cell when the rows are sorted or paged.
 */
export interface CellPosition {
  rowId: string;
  columnId: string;
}

/** A cell by its place in the grid as shown, from zero. */
export interface GridPoint {
  row: number;
  column: number;
}

/** A rectangle of cells, inclusive, as shown. */
export interface GridBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Grid shape
 *
 * The cells as shown: the visible rows and the editable-or-not data columns,
 * in order, with an index of each.
 */
export interface GridShape {
  rowIds: readonly string[];
  columnIds: readonly string[];
  rowIndex: ReadonlyMap<string, number>;
  columnIndex: ReadonlyMap<string, number>;
}

/** The keys that move the active cell. */
export type NavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown";

const NAVIGATION_KEYS = new Set<string>([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** Whether a key moves the active cell. */
export const isNavigationKey = (key: string): key is NavigationKey => NAVIGATION_KEYS.has(key);

/**
 * Create shape
 *
 * @param rowIds - The visible rows, in order.
 * @param columnIds - The data columns, in order.
 * @returns The shape, with its indexes.
 */
export function createShape(rowIds: readonly string[], columnIds: readonly string[]): GridShape {
  return {
    rowIds,
    columnIds,
    rowIndex: new Map(rowIds.map((id, index) => [id, index])),
    columnIndex: new Map(columnIds.map((id, index) => [id, index])),
  };
}

/** Whether two shapes list the same cells in the same order. */
export function sameShape(a: GridShape, b: GridShape): boolean {
  const same = (x: readonly string[], y: readonly string[]) =>
    x === y || (x.length === y.length && x.every((id, index) => id === y[index]));
  return same(a.rowIds, b.rowIds) && same(a.columnIds, b.columnIds);
}

/**
 * To point
 *
 * @returns Where a cell is shown; `null` when it is not shown.
 */
export function toPoint(shape: GridShape, position: CellPosition): GridPoint | null {
  const row = shape.rowIndex.get(position.rowId);
  const column = shape.columnIndex.get(position.columnId);
  return row === undefined || column === undefined ? null : { row, column };
}

/** The cell shown at a point. The point must be inside the grid. */
export function toPosition(shape: GridShape, point: GridPoint): CellPosition {
  return { rowId: shape.rowIds[point.row]!, columnId: shape.columnIds[point.column]! };
}

/**
 * Bounds of
 *
 * @param a - One corner.
 * @param b - The opposite corner.
 * @returns The rectangle between them.
 */
export function boundsOf(a: GridPoint, b: GridPoint): GridBounds {
  return {
    top: Math.min(a.row, b.row),
    bottom: Math.max(a.row, b.row),
    left: Math.min(a.column, b.column),
    right: Math.max(a.column, b.column),
  };
}

/** Whether a point lies in a rectangle. */
export const contains = (bounds: GridBounds, point: GridPoint): boolean =>
  point.row >= bounds.top &&
  point.row <= bounds.bottom &&
  point.column >= bounds.left &&
  point.column <= bounds.right;

/** How many rows and columns a rectangle spans. */
export const sizeOf = (bounds: GridBounds): { rows: number; columns: number } => ({
  rows: bounds.bottom - bounds.top + 1,
  columns: bounds.right - bounds.left + 1,
});

/** Every point of a rectangle, row by row. */
export function pointsIn(bounds: GridBounds): GridPoint[][] {
  const rows: GridPoint[][] = [];
  for (let row = bounds.top; row <= bounds.bottom; row++) {
    const line: GridPoint[] = [];
    for (let column = bounds.left; column <= bounds.right; column++) line.push({ row, column });
    rows.push(line);
  }
  return rows;
}

/** Options for {@link movePoint}. */
export interface MoveOptions {
  /** Ctrl or Cmd is held: jump to the edge of the data. */
  jump: boolean;
  /** Rows a PageUp or PageDown moves by. */
  pageRows: number;
  /** The grid is right-to-left: the horizontal arrows swap. */
  rtl: boolean;
  /** Whether a cell holds no value, for jumps. */
  isEmpty: (point: GridPoint) => boolean;
}

/**
 * Jump
 *
 * The spreadsheet Ctrl+Arrow: from a filled cell next to a filled cell, to the
 * last filled cell of that run; otherwise to the next filled cell, or the
 * grid's edge when there is none.
 */
function jump(
  from: GridPoint,
  step: GridPoint,
  size: { rows: number; columns: number },
  isEmpty: (point: GridPoint) => boolean,
): GridPoint {
  const inside = (point: GridPoint) =>
    point.row >= 0 && point.row < size.rows && point.column >= 0 && point.column < size.columns;
  const next = (point: GridPoint) => ({ row: point.row + step.row, column: point.column + step.column });

  let at = from;
  if (!inside(next(at))) return at;

  if (!isEmpty(at) && !isEmpty(next(at))) {
    while (inside(next(at)) && !isEmpty(next(at))) at = next(at);
    return at;
  }
  at = next(at);
  while (inside(next(at)) && isEmpty(at)) at = next(at);
  return at;
}

/**
 * Move point
 *
 * Where a navigation key takes a cell: one step for an arrow, the row's ends
 * for Home and End (the grid's corners with Ctrl), a page for PageUp and
 * PageDown. The result is always inside the grid.
 *
 * @param size - How many rows and columns the grid has; both at least one.
 * @param from - The cell moved from.
 * @param key - The key pressed.
 * @param options - See {@link MoveOptions}.
 * @returns The cell moved to.
 */
export function movePoint(
  size: { rows: number; columns: number },
  from: GridPoint,
  key: NavigationKey,
  options: MoveOptions,
): GridPoint {
  const lastRow = size.rows - 1;
  const lastColumn = size.columns - 1;
  const clampRow = (row: number) => Math.min(Math.max(row, 0), lastRow);
  const forward = options.rtl ? -1 : 1;

  const arrow = (step: GridPoint) =>
    options.jump
      ? jump(from, step, size, options.isEmpty)
      : {
          row: clampRow(from.row + step.row),
          column: Math.min(Math.max(from.column + step.column, 0), lastColumn),
        };

  switch (key) {
    case "ArrowUp":
      return arrow({ row: -1, column: 0 });
    case "ArrowDown":
      return arrow({ row: 1, column: 0 });
    case "ArrowLeft":
      return arrow({ row: 0, column: -forward });
    case "ArrowRight":
      return arrow({ row: 0, column: forward });
    case "Home":
      return options.jump ? { row: 0, column: 0 } : { row: from.row, column: 0 };
    case "End":
      return options.jump ? { row: lastRow, column: lastColumn } : { row: from.row, column: lastColumn };
    case "PageUp":
      return { row: clampRow(from.row - options.pageRows), column: from.column };
    case "PageDown":
      return { row: clampRow(from.row + options.pageRows), column: from.column };
  }
}

/**
 * Fill bounds
 *
 * The rectangle a fill handle dragged to `point` covers: the selection grown
 * along the one axis the pointer left it furthest on. Filling never shrinks
 * the selection.
 *
 * @param from - The selection.
 * @param point - The cell under the pointer.
 * @returns The rectangle to fill, the selection included; `null` while the pointer is inside the selection.
 */
export function fillBounds(from: GridBounds, point: GridPoint): GridBounds | null {
  const down = point.row - from.bottom;
  const up = from.top - point.row;
  const right = point.column - from.right;
  const left = from.left - point.column;
  const vertical = Math.max(down, up);
  const horizontal = Math.max(right, left);
  if (vertical <= 0 && horizontal <= 0) return null;

  if (vertical >= horizontal) {
    return down > 0 ? { ...from, bottom: point.row } : { ...from, top: point.row };
  }
  return right > 0 ? { ...from, right: point.column } : { ...from, left: point.column };
}

/**
 * Cell flags
 *
 * One cell's part in the selection, as bits, so each cell can subscribe to
 * the selection and re-render only when its own bits change.
 */
export const CellFlag = {
  /** The active cell. */
  Active: 1,
  /** In a selection of more than one cell. */
  Selected: 2,
  EdgeTop: 4,
  EdgeBottom: 8,
  EdgeStart: 16,
  EdgeEnd: 32,
  /** Being edited. */
  Editing: 64,
  /** Inside the rectangle a fill drag would write. */
  FillPreview: 128,
  /** Holds the fill handle: the selection's bottom end corner. */
  FillHandle: 256,
  /** The cell Tab reaches the grid on. */
  TabStop: 512,
  /** Copied or cut, waiting to be pasted. */
  Copied: 1024,
} as const;

/**
 * Edges of
 *
 * The `data-range-edge` value for a cell's flags: the selection's sides it lies on.
 */
export function edgesOf(flags: number): string | undefined {
  const edges: string[] = [];
  if (flags & CellFlag.EdgeTop) edges.push("top");
  if (flags & CellFlag.EdgeBottom) edges.push("bottom");
  if (flags & CellFlag.EdgeStart) edges.push("start");
  if (flags & CellFlag.EdgeEnd) edges.push("end");
  return edges.length ? edges.join(" ") : undefined;
}

/**
 * Edge flags
 *
 * @returns The edge bits of a point on a rectangle's border.
 */
export function edgeFlags(bounds: GridBounds, point: GridPoint): number {
  return (
    (point.row === bounds.top ? CellFlag.EdgeTop : 0) |
    (point.row === bounds.bottom ? CellFlag.EdgeBottom : 0) |
    (point.column === bounds.left ? CellFlag.EdgeStart : 0) |
    (point.column === bounds.right ? CellFlag.EdgeEnd : 0)
  );
}
