import type { CellData } from "@tanstack/react-table";
import {
  boundsOf,
  CellFlag,
  contains,
  createShape,
  edgeFlags,
  sameShape,
  toPoint,
  type CellPosition,
  type GridBounds,
  type GridPoint,
  type GridShape,
} from "./grid";

/**
 * Editing state
 *
 * The cell being edited and how the edit started.
 */
export interface SpreadsheetEditing {
  position: CellPosition;
  /**
   * `"enter"`: started by typing over the cell; the arrow keys commit and
   * move. `"edit"`: started with Enter, F2 or a double click; the arrow
   * keys move the caret.
   */
  mode: "enter" | "edit";
  /** The text typed to start the edit; `null` to start from the cell's value. */
  text: string | null;
  /** Where the caret starts: after the text, or with all of it selected (a click), so typing replaces it. */
  caret: "end" | "all";
  /** The message of a commit that failed validation. */
  error: string | null;
}

/**
 * Spreadsheet state
 *
 * Everything about the selection and the edit, kept outside React state so
 * that only the cells it touches re-render.
 */
export interface SpreadsheetState {
  /** The active cell: where typing goes, and the selection's anchor. */
  active: CellPosition | null;
  /** The selection's other corner; `null` for the active cell alone. */
  extent: CellPosition | null;
  editing: SpreadsheetEditing | null;
  /** The rectangle a fill drag would write, the selection included. */
  fill: GridBounds | null;
  /** The cells last copied or cut, by corner, until the next paste or Escape. */
  copied: { from: CellPosition; to: CellPosition; cut: boolean } | null;
  /** The latest announcement for assistive technology. */
  announcement: string;
}

/**
 * Draft
 *
 * What the open editor holds: text for the built-in editors, a value for a
 * column's own component.
 */
export type SpreadsheetDraft = { kind: "text"; text: string } | { kind: "value"; value: CellData };

/**
 * Spreadsheet actions
 *
 * The engine's commands that the cells and editors call.
 */
export interface SpreadsheetActions {
  /**
   * Commits the open editor's draft (or `override`), then moves. With
   * `refocus` off (focus already went elsewhere) the active cell is not focused.
   * Returns whether it was written.
   */
  commit: (move: "down" | "up" | "right" | "left" | "none", override?: SpreadsheetDraft, refocus?: boolean) => boolean;
  /** Closes the editor without writing. */
  cancel: () => void;
  /** Flips a checkbox cell. */
  toggle: (position: CellPosition) => void;
}

const initialState: SpreadsheetState = {
  active: null,
  extent: null,
  editing: null,
  fill: null,
  copied: null,
  announcement: "",
};

const samePosition = (a: CellPosition | null, b: CellPosition | null) =>
  a === b || (a !== null && b !== null && a.rowId === b.rowId && a.columnId === b.columnId);

/**
 * Spreadsheet store
 *
 * A small external store for the selection and the edit. Cells read it with
 * `useSyncExternalStore` through {@link SpreadsheetStore.flagsOf}, a number
 * per cell, so moving the selection re-renders only the cells whose part in
 * it changed, and never the rows or the table.
 */
export class SpreadsheetStore {
  private state: SpreadsheetState = initialState;
  private shape: GridShape = createShape([], []);
  private listeners = new Set<() => void>();
  /** Derived from the state and the shape on every change. */
  private derived = {
    active: null as GridPoint | null,
    selection: null as GridBounds | null,
    multi: false,
    copied: null as GridBounds | null,
  };

  /** Shows the fill handle on the selection's corner. */
  fillHandle = true;
  /** Set by the engine. */
  actions: SpreadsheetActions = { commit: () => false, cancel: () => {}, toggle: () => {} };
  /** Reads the open editor's draft; set by the editor while it is mounted. */
  draft: (() => SpreadsheetDraft) | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): SpreadsheetState => this.state;

  getShape = (): GridShape => this.shape;

  /** Merges a change into the state and tells every subscriber. */
  setState(patch: Partial<SpreadsheetState>): void {
    const next = { ...this.state, ...patch };
    if (
      samePosition(next.active, this.state.active) &&
      samePosition(next.extent, this.state.extent) &&
      next.editing === this.state.editing &&
      next.fill === this.state.fill &&
      next.copied === this.state.copied &&
      next.announcement === this.state.announcement
    ) {
      return;
    }
    this.state = next;
    this.derive();
    this.emit();
  }

  /** Takes the cells as now shown; tells subscribers only when they changed. */
  setShape(shape: GridShape): void {
    if (sameShape(shape, this.shape)) return;
    this.shape = shape;
    this.derive();
    this.emit();
  }

  /** Where the active cell is shown; `null` when it is not. */
  activePoint(): GridPoint | null {
    return this.derived.active;
  }

  /** The selection as shown: the active cell alone, or the rectangle to the extent. */
  selection(): GridBounds | null {
    return this.derived.selection;
  }

  /**
   * Flags of
   *
   * @returns A cell's part in the selection, as {@link CellFlag} bits.
   */
  flagsOf(rowId: string, columnId: string): number {
    const row = this.shape.rowIndex.get(rowId);
    const column = this.shape.columnIndex.get(columnId);
    if (row === undefined || column === undefined) return 0;
    const point = { row, column };
    const { active, selection, multi, copied } = this.derived;
    const { editing, fill } = this.state;
    let flags = 0;

    if (active ? active.row === row && active.column === column : row === 0 && column === 0) {
      flags |= CellFlag.TabStop;
    }
    if (active && active.row === row && active.column === column) flags |= CellFlag.Active;
    if (selection && multi && contains(selection, point)) flags |= CellFlag.Selected | edgeFlags(selection, point);
    if (editing && editing.position.rowId === rowId && editing.position.columnId === columnId) {
      flags |= CellFlag.Editing;
    }
    if (fill && contains(fill, point) && !(selection && contains(selection, point))) flags |= CellFlag.FillPreview;
    if (
      this.fillHandle &&
      selection &&
      !editing &&
      row === selection.bottom &&
      column === selection.right
    ) {
      flags |= CellFlag.FillHandle;
    }
    if (copied && contains(copied, point)) flags |= CellFlag.Copied;
    return flags;
  }

  private derive(): void {
    const { active, extent, copied } = this.state;
    const activePoint = active ? toPoint(this.shape, active) : null;
    const extentPoint = extent ? toPoint(this.shape, extent) : null;
    const selection = activePoint ? boundsOf(activePoint, extentPoint ?? activePoint) : null;
    const from = copied ? toPoint(this.shape, copied.from) : null;
    const to = copied ? toPoint(this.shape, copied.to) : null;
    this.derived = {
      active: activePoint,
      selection,
      multi: selection !== null && (selection.top !== selection.bottom || selection.left !== selection.right),
      copied: from && to ? boundsOf(from, to) : null,
    };
  }

  private emit(): void {
    for (const listener of Array.from(this.listeners)) listener();
  }
}
