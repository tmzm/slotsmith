import type { CellData, RowData } from "@tanstack/react-table";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DataTableLabels } from "../../slots/types";
import type { DataTableInstance, DataTableRow } from "../features";
import { pasteTargets, parseTSV, toHTMLTable, toTSV } from "./clipboard";
import { resolveColumnEditing, type ColumnEditing } from "./columnEdit";
import { fillValues } from "./fill";
import {
  createShape,
  fillBounds,
  isNavigationKey,
  movePoint,
  pointsIn,
  sizeOf,
  toPoint,
  toPosition,
  type CellPosition,
  type GridBounds,
  type GridPoint,
} from "./grid";
import { emptyHistory, record, redo, undo, type CellEdit, type History } from "./history";
import { SpreadsheetStore, type SpreadsheetDraft } from "./store";
import type {
  DataTableRowChange,
  DataTableSpreadsheetOptions,
  DataTableValueChange,
  DataTableValueChangeSource,
} from "./types";

/**
 * Spreadsheet labels
 *
 * The labels the spreadsheet engine reads.
 */
export type SpreadsheetLabels = Pick<
  DataTableLabels,
  | "editCell"
  | "invalidNumber"
  | "invalidOption"
  | "invalidDate"
  | "invalidBoolean"
  | "cellsCopied"
  | "cellsCut"
  | "cellsPasted"
  | "cellsCleared"
  | "cellsFilled"
  | "undone"
  | "redone"
>;

/**
 * Grid props
 *
 * What the spreadsheet puts on the `<table>`: the grid role and the handlers
 * every cell's keys, presses and focus are delegated to.
 */
export interface SpreadsheetGridProps {
  role: "grid";
  "aria-multiselectable": true;
  "data-spreadsheet": "";
  onKeyDown: (event: KeyboardEvent<HTMLTableElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLTableElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLTableElement>) => void;
  onFocus: (event: FocusEvent<HTMLTableElement>) => void;
}

/**
 * Spreadsheet model
 *
 * The spreadsheet state and the props that wire the grid to it.
 *
 * @typeParam T - The row data type.
 */
export interface SpreadsheetModel<T extends RowData> {
  /** Whether spreadsheet mode is on. */
  enabled: boolean;
  /** The selection and the edit. Cells subscribe to it; it never re-renders the table. */
  store: SpreadsheetStore;
  /** Props for the `<table>`. The same object on every render. */
  gridProps: SpreadsheetGridProps;
  /** A column's editing rules; `null` for a read-only column. */
  editingOf: (columnId: string) => ColumnEditing<T> | null;
  /** Undoes the last change. */
  undo: () => void;
  /** Redoes the last undone change. */
  redo: () => void;
}

/**
 * Spreadsheet options
 *
 * @typeParam T - The row data type.
 */
export interface UseSpreadsheetOptions<T extends RowData> {
  enabled: boolean;
  options: DataTableSpreadsheetOptions<T>;
  table: DataTableInstance<T>;
  labels: SpreadsheetLabels;
  onValueChange?: (value: T[], change: DataTableValueChange<T>) => void;
}

/** One cell a change writes. */
interface CellUpdate {
  rowId: string;
  columnId: string;
  value: CellData;
}

type Move = "down" | "up" | "right" | "left" | "none";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const isEmptyValue = (value: CellData) => value === null || value === undefined || value === "";

/** The grid's data cell an event happened in, or `null`. */
function cellOf(grid: HTMLElement, target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>("[data-column-id]");
  return cell && cell.closest("[role=grid]") === grid ? cell : null;
}

/** A cell element's position, from its row's `data-row-id` and its own `data-column-id`. */
function positionOf(cell: HTMLElement): CellPosition | null {
  const rowId = cell.closest("[data-row-id]")?.getAttribute("data-row-id");
  const columnId = cell.getAttribute("data-column-id");
  return rowId != null && columnId !== null ? { rowId, columnId } : null;
}

/** The element of a cell inside the grid; `null` when it is not rendered. */
function findCell(grid: HTMLElement, position: CellPosition): HTMLElement | null {
  for (const row of Array.from(grid.querySelectorAll<HTMLElement>("[data-row-id]"))) {
    if (row.getAttribute("data-row-id") !== position.rowId) continue;
    for (const cell of Array.from(row.querySelectorAll<HTMLElement>("[data-column-id]"))) {
      if (cell.getAttribute("data-column-id") === position.columnId) return cell;
    }
  }
  return null;
}

/** Focuses a cell and scrolls it into view, under a sticky header too (see `scroll-margin` in the stylesheet). */
function focusCell(cell: HTMLElement): void {
  cell.focus({ preventScroll: true });
  cell.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

/** Rows a PageUp or PageDown moves by: about one scroll area's worth. */
function pageRowsOf(grid: HTMLElement, cell: HTMLElement | null): number {
  const area = grid.closest<HTMLElement>("[class*='scroll']") ?? grid.parentElement;
  const rowHeight = cell?.getBoundingClientRect().height || 40;
  const height = area?.clientHeight || 400;
  return Math.max(1, Math.floor(height / rowHeight) - 1);
}

/**
 * useSpreadsheet
 *
 * The spreadsheet engine: the active cell and the selection, keyboard and
 * pointer navigation, editing, copy, cut and paste, the fill handle, and undo.
 * It never changes the rows itself: every write reports the new rows through
 * `onValueChange`, and the app stores them.
 *
 * The selection lives in a {@link SpreadsheetStore}, outside React state:
 * moving it, or typing in an editor, re-renders the cells involved and
 * nothing else.
 *
 * @typeParam T - The row data type.
 * @param options - See {@link UseSpreadsheetOptions}.
 * @returns See {@link SpreadsheetModel}.
 */
export function useSpreadsheet<T extends RowData>(options: UseSpreadsheetOptions<T>): SpreadsheetModel<T> {
  const { enabled, table, labels } = options;
  const [store] = useState(() => new SpreadsheetStore());
  const setSubRows = options.options.setSubRows;
  store.fillHandle = options.options.fillHandle !== false;

  const leafColumns = table.getAllLeafColumns();
  const editing = useMemo(() => {
    const byColumn = new Map<string, ColumnEditing<T>>();
    if (!enabled) return byColumn;
    for (const column of leafColumns) {
      const rules = resolveColumnEditing(column.id, column.columnDef, labels, setSubRows !== undefined);
      if (rules) byColumn.set(column.id, rules);
    }
    return byColumn;
  }, [enabled, leafColumns, labels, setSubRows]);

  const rows = table.getRowModel().rows;
  const shape = useMemo(
    () => createShape(rows.map((row) => row.id), leafColumns.map((column) => column.id)),
    [rows, leafColumns],
  );
  useIsomorphicLayoutEffect(() => store.setShape(shape), [store, shape]);

  const latest = useRef({ options, editing, rows });
  latest.current = { options, editing, rows };
  const history = useRef<History<CellData>>(emptyHistory());
  const grid = useRef<HTMLElement | null>(null);

  const engine = useMemo(() => {
    const now = () => latest.current;
    const editingOf = (columnId: string) => now().editing.get(columnId) ?? null;
    const size = () => {
      const shape = store.getShape();
      return { rows: shape.rowIds.length, columns: shape.columnIds.length };
    };
    const rowAt = (point: GridPoint): DataTableRow<T> | undefined => now().rows[point.row];
    const columnAt = (point: GridPoint) => store.getShape().columnIds[point.column]!;
    const valueAt = (point: GridPoint): CellData => rowAt(point)?.getValue<CellData>(columnAt(point));
    const rowById = (rowId: string): DataTableRow<T> | undefined =>
      now().options.table.getCoreRowModel().rowsById[rowId];
    const announce = (announcement: string) => store.setState({ announcement });

    function focusActive(): void {
      const active = store.getState().active;
      if (!grid.current || !active) return;
      const cell = findCell(grid.current, active);
      if (cell) focusCell(cell);
    }

    /**
     * Focus active after render
     *
     * Focuses the active cell now, and again once React has removed the
     * editor if focus was lost with it: a picker may move focus back into
     * itself as it closes, just before it unmounts.
     */
    function focusActiveAfterRender(): void {
      focusActive();
      setTimeout(() => {
        const focused = document.activeElement;
        if (!focused || focused === document.body || !focused.isConnected) focusActive();
      }, 0);
    }

    function select(active: CellPosition | null, extent: CellPosition | null = null): void {
      store.setState({ active, extent, fill: null });
      focusActive();
    }

    /**
     * Rebuild
     *
     * The rows with some replaced: a replaced sub-row is written into its
     * parent with `setSubRows`, up to the top level.
     */
    function rebuild(replaced: Map<string, T>): T[] {
      const core = now().options.table.getCoreRowModel();
      const touched = new Set<string>();
      for (const id of replaced.keys()) {
        for (let row = core.rowsById[id]; row; row = row.parentId ? core.rowsById[row.parentId] : undefined) {
          touched.add(row.id);
        }
      }
      const write = now().options.options.setSubRows;
      const build = (row: DataTableRow<T>): T => {
        const own = replaced.get(row.id) ?? row.original;
        if (!write || !row.subRows.some((child) => touched.has(child.id))) return own;
        return write(own, row.subRows.map((child) => (touched.has(child.id) ? build(child) : child.original)));
      };
      return core.rows.map((row) => (touched.has(row.id) ? build(row) : row.original));
    }

    /**
     * Apply
     *
     * Writes cells, reports the new rows through `onValueChange`, and records
     * the change for undo. Read-only cells, invalid values (when `validate`)
     * and values equal to the current ones are left out.
     *
     * @returns How many cells were written and how many were skipped.
     */
    function apply(
      updates: readonly CellUpdate[],
      source: DataTableValueChangeSource,
      validate = true,
    ): { written: number; skipped: number } {
      const { onValueChange } = now().options;
      const columnOrder = store.getShape().columnIndex;
      const replaced = new Map<string, T>();
      const changed = new Map<string, { previous: T; columns: Set<string> }>();
      const edits: CellEdit<CellData>[] = [];
      let skipped = 0;

      for (const update of updates) {
        const row = rowById(update.rowId);
        const rules = editingOf(update.columnId);
        if (!row || !rules || !rules.isEditable(row)) {
          skipped++;
          continue;
        }
        const current = replaced.get(row.id) ?? row.original;
        if (validate && rules.validate(update.value, current) !== null) {
          skipped++;
          continue;
        }
        const before = row.getValue<CellData>(update.columnId);
        if (Object.is(before, update.value)) continue;

        replaced.set(row.id, rules.setValue(current, update.value));
        const entry = changed.get(row.id) ?? { previous: row.original, columns: new Set<string>() };
        entry.columns.add(update.columnId);
        changed.set(row.id, entry);
        edits.push({ rowId: row.id, columnId: update.columnId, before, after: update.value });
      }

      if (edits.length === 0) return { written: 0, skipped };
      if (source !== "undo" && source !== "redo") {
        history.current = record(history.current, edits, now().options.options.history ?? 100);
      }

      const rowChanges: DataTableRowChange<T>[] = Array.from(changed, ([rowId, entry]) => ({
        rowId,
        previous: entry.previous,
        next: replaced.get(rowId)!,
        columnIds: Array.from(entry.columns).sort(
          (a, b) => (columnOrder.get(a) ?? 0) - (columnOrder.get(b) ?? 0),
        ),
      }));
      onValueChange?.(rebuild(replaced), { source, rows: rowChanges });
      return { written: edits.length, skipped };
    }

    /** Whether a cell's editor is the checkbox, which toggles instead of opening. */
    function isCheckboxCell(position: CellPosition): boolean {
      const row = rowById(position.rowId);
      const rules = editingOf(position.columnId);
      return Boolean(row && rules && rules.editorFor(row.getValue<CellData>(position.columnId)).kind === "checkbox");
    }

    /** Whether a cell can be edited now. */
    function canEdit(position: CellPosition): boolean {
      const row = rowById(position.rowId);
      const rules = editingOf(position.columnId);
      return Boolean(row && rules && rules.isEditable(row));
    }

    function startEdit(
      position: CellPosition,
      mode: "enter" | "edit",
      text: string | null,
      caret: "end" | "all" = "end",
    ): void {
      if (!canEdit(position)) return;
      const row = rowById(position.rowId)!;
      const rules = editingOf(position.columnId)!;
      const value = row.getValue<CellData>(position.columnId);
      if (rules.editorFor(value).kind === "checkbox") {
        if (text === null || text === " ") apply([{ ...position, value: !value }], "edit");
        return;
      }
      store.setState({
        active: position,
        extent: null,
        fill: null,
        editing: { position, mode, text, caret, error: null },
      });
    }

    function cancel(): void {
      if (!store.getState().editing) return;
      store.draft = null;
      store.setState({ editing: null });
      focusActiveAfterRender();
    }

    function moveActive(move: Move): void {
      const active = store.activePoint();
      if (!active || move === "none") return;
      const key = move === "down" ? "ArrowDown" : move === "up" ? "ArrowUp" : move === "right" ? "ArrowRight" : "ArrowLeft";
      const next = movePoint(size(), active, key, {
        jump: false,
        pageRows: 1,
        rtl: false,
        isEmpty: () => false,
      });
      select(toPosition(store.getShape(), next));
    }

    function commit(move: Move, override?: SpreadsheetDraft, refocus = true): boolean {
      const state = store.getState().editing;
      if (!state) return false;
      const draft = override ?? store.draft?.();
      const row = rowById(state.position.rowId);
      const rules = editingOf(state.position.columnId);
      if (!draft || !row || !rules) {
        cancel();
        return false;
      }
      const current = row.getValue<CellData>(state.position.columnId);
      const parsed =
        draft.kind === "text" ? rules.parse(draft.text, row.original, current) : { ok: true as const, value: draft.value };
      // An untouched value is left as it is, valid or not, so moving on from a cell never gets stuck.
      const unchanged = parsed.ok && Object.is(parsed.value, current);
      const error = unchanged ? null : parsed.ok ? rules.validate(parsed.value, row.original) : parsed.error;
      if (error !== null || !parsed.ok) {
        store.setState({ editing: { ...state, error } });
        return false;
      }
      store.draft = null;
      store.setState({ editing: null });
      if (!unchanged) apply([{ ...state.position, value: parsed.value }], "edit", false);
      if (!refocus) return true;
      if (move === "none") focusActiveAfterRender();
      else moveActive(move);
      return true;
    }

    function toggle(position: CellPosition): void {
      if (!canEdit(position)) return;
      const value = rowById(position.rowId)!.getValue<CellData>(position.columnId);
      apply([{ ...position, value: !value }], "edit");
    }

    store.actions = { commit, cancel, toggle };

    /** The selection's cells, row by row, as positions. */
    function selectedPositions(bounds: GridBounds): CellPosition[][] {
      const shape = store.getShape();
      return pointsIn(bounds).map((line) => line.map((point) => toPosition(shape, point)));
    }

    function clear(): void {
      const bounds = store.selection();
      if (!bounds) return;
      const updates: CellUpdate[] = [];
      for (const position of selectedPositions(bounds).flat()) {
        const row = rowById(position.rowId);
        const rules = editingOf(position.columnId);
        if (!row || !rules || !rules.isEditable(row)) continue;
        const empty = rules.empty(row.original, row.getValue<CellData>(position.columnId));
        if (empty.ok) updates.push({ ...position, value: empty.value });
      }
      const { written } = apply(updates, "clear");
      if (written) announce(now().options.labels.cellsCleared(written));
    }

    /** The selection's cells as text, row by row. */
    function selectedText(bounds: GridBounds): string[][] {
      return pointsIn(bounds).map((line) =>
        line.map((point) => {
          const row = rowAt(point);
          if (!row) return "";
          const value = valueAt(point);
          const rules = editingOf(columnAt(point));
          if (rules) return rules.format(value, row.original);
          return value === null || value === undefined ? "" : String(value);
        }),
      );
    }

    function copy(event: ClipboardEvent, cut: boolean): void {
      const bounds = store.selection();
      const { active, extent } = store.getState();
      if (!bounds || !active || !event.clipboardData) return;
      const text = selectedText(bounds);
      event.clipboardData.setData("text/plain", toTSV(text));
      event.clipboardData.setData("text/html", toHTMLTable(text));
      event.preventDefault();
      const count = text.length * (text[0]?.length ?? 0);
      if (cut) {
        clear();
        store.setState({ copied: null });
        announce(now().options.labels.cellsCut(count));
      } else {
        store.setState({ copied: { from: active, to: extent ?? active, cut: false } });
        announce(now().options.labels.cellsCopied(count));
      }
    }

    function paste(event: ClipboardEvent): void {
      const bounds = store.selection();
      const text = event.clipboardData?.getData("text/plain");
      if (!bounds || !text) return;
      event.preventDefault();
      const shape = store.getShape();
      const targets = pasteTargets(bounds, parseTSV(text), size());
      const updates: CellUpdate[] = [];
      let unreadable = 0;
      for (const target of targets) {
        const position = toPosition(shape, target.point);
        const row = rowById(position.rowId);
        const rules = editingOf(position.columnId);
        if (!row || !rules || !rules.isEditable(row)) {
          unreadable++;
          continue;
        }
        const parsed = rules.parse(target.text, row.original, row.getValue<CellData>(position.columnId));
        if (parsed.ok) updates.push({ ...position, value: parsed.value });
        else unreadable++;
      }
      const { written, skipped } = apply(updates, "paste");
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (first && last) {
        store.setState({ active: toPosition(shape, first.point), extent: toPosition(shape, last.point), copied: null });
      }
      announce(now().options.labels.cellsPasted(written, skipped + unreadable));
    }

    /**
     * Fill
     *
     * Writes the cells of `target` outside `source`, continuing each line of
     * `source` along the axis the fill grew on. Along a column the values
     * are the column's own; across columns they pass through text, so each
     * column parses its own.
     *
     * @param series - Continue series (the fill handle); `false` repeats the source as is (Ctrl+D, Ctrl+R).
     */
    function fill(source: GridBounds, target: GridBounds, series: boolean): void {
      const shape = store.getShape();
      const vertical = target.top !== source.top || target.bottom !== source.bottom;
      const updates: CellUpdate[] = [];
      const extend = <V>(values: readonly V[], count: number, direction: 1 | -1): V[] =>
        series
          ? fillValues(values, count, direction)
          : Array.from({ length: count }, (_, n) =>
              values[direction === 1 ? n % values.length : values.length - 1 - (n % values.length)]!,
            );

      if (vertical) {
        for (let column = source.left; column <= source.right; column++) {
          const values: CellData[] = [];
          for (let row = source.top; row <= source.bottom; row++) values.push(valueAt({ row, column }));
          const after = target.bottom - source.bottom;
          const before = source.top - target.top;
          extend(values, after, 1).forEach((value, n) =>
            updates.push({ ...toPosition(shape, { row: source.bottom + 1 + n, column }), value }),
          );
          extend(values, before, -1).forEach((value, n) =>
            updates.push({ ...toPosition(shape, { row: source.top - 1 - n, column }), value }),
          );
        }
      } else {
        for (let row = source.top; row <= source.bottom; row++) {
          const texts = selectedText({ top: row, bottom: row, left: source.left, right: source.right })[0]!;
          const write = (column: number, text: string) => {
            const position = toPosition(shape, { row, column });
            const record = rowById(position.rowId);
            const rules = editingOf(position.columnId);
            if (!record || !rules) return;
            const parsed = rules.parse(text, record.original, record.getValue<CellData>(position.columnId));
            if (parsed.ok) updates.push({ ...position, value: parsed.value });
          };
          extend(texts, target.right - source.right, 1).forEach((text, n) => write(source.right + 1 + n, text));
          extend(texts, source.left - target.left, -1).forEach((text, n) => write(source.left - 1 - n, text));
        }
      }

      const { written } = apply(updates, "fill");
      store.setState({
        active: toPosition(shape, { row: target.top, column: target.left }),
        extent: toPosition(shape, { row: target.bottom, column: target.right }),
        fill: null,
      });
      if (written) announce(now().options.labels.cellsFilled(written));
    }

    /** Ctrl+D and Ctrl+R: copy the selection's first row down, or first column across. */
    function fillFromEdge(down: boolean): void {
      const bounds = store.selection();
      if (!bounds) return;
      const { rows, columns } = sizeOf(bounds);
      if (down) {
        // One row selected: copy the row above into it, as spreadsheets do.
        if (rows === 1 && bounds.top > 0) fill({ ...bounds, top: bounds.top - 1, bottom: bounds.top - 1 }, { ...bounds, top: bounds.top - 1 }, false);
        else if (rows > 1) fill({ ...bounds, bottom: bounds.top }, bounds, false);
      } else if (columns === 1 && bounds.left > 0) {
        fill({ ...bounds, left: bounds.left - 1, right: bounds.left - 1 }, { ...bounds, left: bounds.left - 1 }, false);
      } else if (columns > 1) {
        fill({ ...bounds, right: bounds.left }, bounds, false);
      }
    }

    function undoLast(): void {
      const result = undo(history.current);
      if (!result) return;
      history.current = result.history;
      apply(result.change.map(({ rowId, columnId, after }) => ({ rowId, columnId, value: after })), "undo", false);
      announce(now().options.labels.undone);
    }

    function redoLast(): void {
      const result = redo(history.current);
      if (!result) return;
      history.current = result.history;
      apply(result.change.map(({ rowId, columnId, after }) => ({ rowId, columnId, value: after })), "redo", false);
      announce(now().options.labels.redone);
    }

    function onEditingKey(event: KeyboardEvent<HTMLTableElement>, mode: "enter" | "edit"): void {
      // The editor used the key itself (an open popup's Enter, Escape or arrows), or an IME is composing.
      if (event.defaultPrevented || event.nativeEvent.isComposing) return;
      const { key, shiftKey } = event;
      const enterMoves = now().options.options.enterMoves ?? "down";
      const handled = () => event.preventDefault();

      if (key === "Escape") {
        handled();
        cancel();
      } else if (key === "Enter" && !event.altKey) {
        handled();
        const forward: Move = enterMoves === "right" ? "right" : enterMoves === "none" ? "none" : "down";
        commit(shiftKey ? (forward === "right" ? "left" : forward === "down" ? "up" : "none") : forward);
      } else if (key === "Tab") {
        handled();
        commit(shiftKey ? "left" : "right");
      } else if (key === "F2") {
        handled();
        const state = store.getState().editing;
        if (state) store.setState({ editing: { ...state, mode: state.mode === "enter" ? "edit" : "enter" } });
      }
    }

    /**
     * Pristine
     *
     * Whether the open editor was opened by a click and not typed in yet.
     * Such an editor stands in for the selected cell: every key but a
     * printable one, and copy, cut and paste, go to the grid.
     */
    function pristine(): boolean {
      const state = store.getState().editing;
      if (!state || state.mode !== "enter" || state.text !== null) return false;
      const draft = store.draft?.();
      const row = rowById(state.position.rowId);
      const rules = editingOf(state.position.columnId);
      if (!draft || !row || !rules) return true;
      const current = row.getValue<CellData>(state.position.columnId);
      return draft.kind === "text" ? draft.text === rules.format(current, row.original) : Object.is(draft.value, current);
    }

    /** Closes the editor without a word, focus back on its cell. */
    function closeQuietly(): void {
      store.draft = null;
      store.setState({ editing: null });
      focusActive();
    }

    const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    /** Keys an untouched editor keeps: Backspace empties its selected text, as in any input. */
    const EDITOR_KEYS = new Set(["Enter", "Tab", "Escape", "F2", "Backspace"]);

    function onKeyDown(event: KeyboardEvent<HTMLTableElement>): void {
      grid.current = event.currentTarget;
      const cell = cellOf(event.currentTarget, event.target);
      if (!cell) return;
      let state = store.getState();
      if (state.editing) {
        const { key } = event;
        const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
        const free = !event.defaultPrevented && !event.nativeEvent.isComposing;
        if (free && !printable && !EDITOR_KEYS.has(key) && pristine()) {
          // An untouched editor from a click: the key is the grid's.
          closeQuietly();
        } else if (free && state.editing.mode === "enter" && ARROWS.has(key)) {
          // Typed over: an arrow writes the value, then moves (or extends with Shift) from the cell.
          event.preventDefault();
          if (!commit("none")) return;
        } else {
          onEditingKey(event, state.editing.mode);
          return;
        }
        state = store.getState();
      } else if (event.target !== cell) {
        // Keys from a control inside a cell (a link, a button) are its own.
        return;
      }

      const position = positionOf(cell);
      if (!position) return;
      if (!state.active || toPoint(store.getShape(), state.active) === null) store.setState({ active: position });

      const { key, shiftKey, altKey } = event;
      const ctrl = event.ctrlKey || event.metaKey;
      const shape = store.getShape();
      const active = store.activePoint();
      if (!active) return;
      const handled = () => event.preventDefault();

      if (isNavigationKey(key) && !altKey) {
        handled();
        const extentPoint = state.extent ? toPoint(shape, state.extent) : null;
        const from = shiftKey ? (extentPoint ?? active) : active;
        const to = movePoint(size(), from, key, {
          jump: ctrl && key !== "PageUp" && key !== "PageDown",
          pageRows: pageRowsOf(event.currentTarget, cell),
          rtl: getComputedStyle(event.currentTarget).direction === "rtl",
          isEmpty: (point) => isEmptyValue(valueAt(point)),
        });
        if (shiftKey) {
          store.setState({ extent: toPosition(shape, to) });
          const extentCell = findCell(event.currentTarget, toPosition(shape, to));
          extentCell?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        } else {
          select(toPosition(shape, to));
        }
        return;
      }

      if (key === "Tab") {
        const { columns } = size();
        const next = active.column + (shiftKey ? -1 : 1);
        // At the row's ends Tab leaves the grid, as it does every composite widget.
        if (next < 0 || next >= columns) return;
        handled();
        select(toPosition(shape, { row: active.row, column: next }));
        return;
      }

      if (ctrl && !altKey) {
        const lower = key.toLowerCase();
        if (lower === "a") {
          handled();
          const { rows, columns } = size();
          store.setState({
            active: toPosition(shape, { row: 0, column: 0 }),
            extent: toPosition(shape, { row: rows - 1, column: columns - 1 }),
          });
        } else if (lower === "z" && !shiftKey) {
          handled();
          undoLast();
        } else if (lower === "y" || (lower === "z" && shiftKey)) {
          handled();
          redoLast();
        } else if (lower === "d") {
          handled();
          fillFromEdge(true);
        } else if (lower === "r") {
          handled();
          fillFromEdge(false);
        } else if (key === " ") {
          handled();
          const { rows } = size();
          store.setState({
            active: toPosition(shape, { row: 0, column: active.column }),
            extent: toPosition(shape, { row: rows - 1, column: active.column }),
          });
        }
        return;
      }

      if (key === " " && shiftKey) {
        handled();
        const { columns } = size();
        store.setState({
          active: toPosition(shape, { row: active.row, column: 0 }),
          extent: toPosition(shape, { row: active.row, column: columns - 1 }),
        });
        return;
      }

      const activePosition = toPosition(shape, active);
      if (key === "Enter" || key === "F2") {
        handled();
        startEdit(activePosition, "edit", null);
      } else if (key === "Delete" || key === "Backspace") {
        handled();
        clear();
      } else if (key === "Escape") {
        if (state.extent || state.copied) {
          handled();
          store.setState({ extent: null, copied: null });
        }
      } else if (key.length === 1 && !altKey && !event.nativeEvent.isComposing) {
        // A printable key types over the cell; a space toggles a checkbox.
        handled();
        startEdit(activePosition, "enter", key);
      }
    }

    /**
     * Track selection
     *
     * Selects cells while the pointer is dragged from a pressed cell. A
     * press released on the same cell is a click: it opens the cell's
     * editor, its text selected, so typing replaces it and the arrow keys
     * still move on.
     */
    function trackSelection(gridElement: HTMLElement, pointerId: number, pressed: CellPosition, edit: boolean): void {
      let dragged = false;
      const onMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const cell = cellOf(gridElement, document.elementFromPoint(event.clientX, event.clientY));
        const position = cell && positionOf(cell);
        if (!position) return;
        if (position.rowId !== pressed.rowId || position.columnId !== pressed.columnId) dragged = true;
        store.setState({ extent: dragged ? position : null });
      };
      const onUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        if (!dragged && edit && event.type === "pointerup") startEdit(pressed, "enter", null, "all");
      };
      const onCancel = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        dragged = true;
        onUp(event);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    }

    /** Drags the fill handle: a preview while moving, a fill on release. */
    function trackFill(gridElement: HTMLElement, pointerId: number, source: GridBounds): void {
      const shape = store.getShape();
      let target: GridBounds | null = null;
      const onMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const cell = cellOf(gridElement, document.elementFromPoint(event.clientX, event.clientY));
        const position = cell && positionOf(cell);
        const point = position && toPoint(shape, position);
        if (!point) return;
        target = fillBounds(source, point);
        store.setState({ fill: target });
      };
      const onUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        if (target) fill(source, target, true);
        else store.setState({ fill: null });
      };
      const onCancel = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        store.setState({ fill: null });
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    }

    function onPointerDown(event: ReactPointerEvent<HTMLTableElement>): void {
      grid.current = event.currentTarget;
      if (event.button !== 0) return;
      const cell = cellOf(event.currentTarget, event.target);
      const position = cell && positionOf(cell);
      if (!cell || !position) return;

      const state = store.getState();
      if (state.editing) {
        const same =
          state.editing.position.rowId === position.rowId && state.editing.position.columnId === position.columnId;
        // A press inside the open editor places the caret: the arrow keys now move it.
        if (same) {
          if (state.editing.mode === "enter") store.setState({ editing: { ...state.editing, mode: "edit" } });
          return;
        }
        // A value that does not validate keeps its editor open.
        if (!commit("none")) return;
      }

      const target = event.target as Element;
      if (target.closest("[data-fill-handle]")) {
        const source = store.selection();
        if (!source) return;
        event.preventDefault();
        trackFill(event.currentTarget, event.pointerId, source);
        return;
      }

      // A checkbox column's box toggles on its own click; focus stays on the cell for the keys.
      const checkbox = target.closest("input[type=checkbox], [role=checkbox]") !== null;
      // A press on any other control inside the cell (a link, a button) still selects the cell, and keeps working.
      const onControl =
        !checkbox && target !== cell && target.closest("a, button, input, select, textarea, [tabindex]") !== cell;
      const extend = event.shiftKey && state.active !== null;
      if (extend) store.setState({ extent: position });
      else store.setState({ active: position, extent: null });
      if (onControl) return;
      event.preventDefault();
      focusCell(cell);
      const editable = !extend && !checkbox && canEdit(position) && !isCheckboxCell(position);
      trackSelection(event.currentTarget, event.pointerId, position, editable);
    }

    function onDoubleClick(event: MouseEvent<HTMLTableElement>): void {
      grid.current = event.currentTarget;
      const cell = cellOf(event.currentTarget, event.target);
      const position = cell && positionOf(cell);
      if (!position || store.getState().editing) return;
      startEdit(position, "edit", null);
    }

    function onFocus(event: FocusEvent<HTMLTableElement>): void {
      grid.current = event.currentTarget;
      const cell = cellOf(event.currentTarget, event.target);
      if (!cell || event.target !== cell || store.getState().editing) return;
      const position = positionOf(cell);
      const active = store.getState().active;
      if (position && (!active || active.rowId !== position.rowId || active.columnId !== position.columnId)) {
        store.setState({ active: position, extent: null });
      }
    }

    /** Copy, cut and paste reach the document from a focused cell; only the grid's own are handled. */
    function onClipboard(event: ClipboardEvent): void {
      const gridElement = grid.current;
      const focused = document.activeElement;
      if (!gridElement || !focused) return;
      if (store.getState().editing) {
        // Typed text copies and pastes as text; an untouched editor from a click lets the grid have them.
        if (!pristine() || !gridElement.contains(focused)) return;
        closeQuietly();
      } else if (cellOf(gridElement, focused) !== focused) {
        return;
      }
      if (event.type === "paste") paste(event);
      else copy(event, event.type === "cut");
    }

    const gridProps: SpreadsheetGridProps = {
      role: "grid",
      "aria-multiselectable": true,
      "data-spreadsheet": "",
      onKeyDown,
      onPointerDown,
      onDoubleClick,
      onFocus,
    };

    return { gridProps, editingOf, onClipboard, undo: undoLast, redo: redoLast };
  }, [store]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("copy", engine.onClipboard);
    document.addEventListener("cut", engine.onClipboard);
    document.addEventListener("paste", engine.onClipboard);
    return () => {
      document.removeEventListener("copy", engine.onClipboard);
      document.removeEventListener("cut", engine.onClipboard);
      document.removeEventListener("paste", engine.onClipboard);
    };
  }, [enabled, engine]);

  /** The editing rules change with the columns; their reader changes with them, so rows re-render then. */
  const editingOf = useMemo(
    () => (columnId: string) => editing.get(columnId) ?? null,
    [editing],
  );

  return {
    enabled,
    store,
    gridProps: engine.gridProps,
    editingOf,
    undo: engine.undo,
    redo: engine.redo,
  };
}

