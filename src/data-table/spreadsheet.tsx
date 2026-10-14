import type { CellData, RowData } from "@tanstack/react-table";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type FocusEvent,
  type ReactNode,
} from "react";
import { classes } from "./classes";
import type { ColumnEditing } from "./core/spreadsheet/columnEdit";
import { CellFlag, edgesOf } from "./core/spreadsheet/grid";
import type { SpreadsheetEditing, SpreadsheetStore } from "./core/spreadsheet/store";
import type { DataTableRow } from "./core/features";
import { cx } from "./slots/fallbacks";
import type { CellEditorSlotProps, CellSlotProps, DataTableComponents } from "./slots/types";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Visually hidden, inline so it holds without the stylesheet too. */
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Layout
 *
 * What the editor needs to lie over its cell, inline as well as in the
 * stylesheet, so it holds in an app that styles the table with its own
 * components and no `styles.css`: the cell is the editor's containing
 * block, its content stays (unseen) to keep the column's width, and the
 * editor covers it exactly.
 */
const CELL_LAYOUT = { position: "relative" } as const;
const GHOST_LAYOUT = { visibility: "hidden" } as const;
const HOST_LAYOUT = { position: "absolute", inset: 0, zIndex: 1, display: "flex", alignItems: "stretch" } as const;

/**
 * Spreadsheet render context
 *
 * What a row needs to render its cells as grid cells. The same object while
 * the columns and their rules stay the same.
 *
 * @typeParam T - The row data type.
 */
export interface SpreadsheetRenderContext<T extends RowData> {
  store: SpreadsheetStore;
  editingOf: (columnId: string) => ColumnEditing<T> | null;
}

/**
 * Grid cell props
 *
 * @typeParam T - The row data type.
 */
export interface GridCellProps<T extends RowData> {
  /** The `Cell` slot. */
  Cell: ComponentType<CellSlotProps>;
  /** The cell's props, as the table computed and `slotProps.cell` extended them. */
  cellProps: CellSlotProps;
  row: DataTableRow<T>;
  columnId: string;
  /** The column's name, for the editor's accessible name. */
  columnName: string;
  /** What the cell shows while it is not edited. */
  content: ReactNode;
  spreadsheet: SpreadsheetRenderContext<T>;
  components: DataTableComponents;
  editLabel: (column: string) => string;
}

/**
 * Grid cell
 *
 * A body cell in spreadsheet mode. It subscribes to its own part of the
 * selection ({@link SpreadsheetStore.flagsOf}), so moving the selection or
 * opening an editor re-renders this cell alone. Carries `role="gridcell"`,
 * a roving `tabIndex`, `aria-selected`, `aria-readonly`, `data-column-id`,
 * and `data-active`, `data-selected`, `data-range-edge`, `data-editing`,
 * `data-fill-preview`, `data-copied` and `data-editable` for styling.
 *
 * @typeParam T - The row data type.
 */
export function GridCell<T extends RowData>({
  Cell,
  cellProps,
  row,
  columnId,
  columnName,
  content,
  spreadsheet,
  components,
  editLabel,
}: GridCellProps<T>) {
  const { store, editingOf } = spreadsheet;
  const flags = useSyncExternalStore(
    store.subscribe,
    () => store.flagsOf(row.id, columnId),
    () => 0,
  );
  const rules = editingOf(columnId);
  const editable = rules?.isEditable(row) ?? false;
  const has = (flag: number) => (flags & flag) !== 0;
  const mark = (flag: number) => (has(flag) ? "" : undefined);

  // A checkbox column shows the table's own checkbox, toggled by a click or Space.
  const value = rules ? row.getValue<CellData>(columnId) : undefined;
  const shown =
    rules && rules.editorFor(value).kind === "checkbox" ? (
      <span className={classes.checkboxCell}>
        <components.Checkbox
          checked={value === true}
          indeterminate={false}
          disabled={!editable}
          onCheckedChange={() => store.actions.toggle({ rowId: row.id, columnId })}
          aria-label={columnName}
          tabIndex={-1}
        />
      </span>
    ) : (
      content
    );

  return (
    <Cell
      {...cellProps}
      style={{ ...cellProps.style, ...CELL_LAYOUT }}
      role="gridcell"
      tabIndex={has(CellFlag.TabStop) ? 0 : -1}
      aria-selected={has(CellFlag.Active) || has(CellFlag.Selected)}
      aria-readonly={editable ? undefined : true}
      data-column-id={columnId}
      data-active={mark(CellFlag.Active)}
      data-selected={mark(CellFlag.Selected)}
      data-range-edge={edgesOf(flags)}
      data-editing={mark(CellFlag.Editing)}
      data-fill-preview={mark(CellFlag.FillPreview)}
      data-copied={mark(CellFlag.Copied)}
      data-editable={editable ? "" : undefined}
    >
      {has(CellFlag.Editing) && rules ? (
        <>
          {/* Kept, unseen, so the column keeps its width while the editor lies over the cell. */}
          <div className={classes.cellGhost} style={GHOST_LAYOUT} aria-hidden="true">
            {shown}
          </div>
          <EditorHost
            store={store}
            rules={rules}
            row={row}
            columnId={columnId}
            CellEditor={components.CellEditor}
            label={editLabel(columnName)}
          />
        </>
      ) : (
        shown
      )}
      {has(CellFlag.FillHandle) && <components.FillHandle data-fill-handle="" aria-hidden />}
    </Cell>
  );
}

/**
 * Editor host props
 *
 * @typeParam T - The row data type.
 */
interface EditorHostProps<T extends RowData> {
  store: SpreadsheetStore;
  rules: ColumnEditing<T>;
  row: DataTableRow<T>;
  columnId: string;
  CellEditor: ComponentType<CellEditorSlotProps>;
  label: string;
}

/**
 * Editor host
 *
 * Holds the draft while a cell is edited, so typing re-renders the editor
 * and nothing else. It hands the engine a reader for the draft, moves focus
 * into the editor when it opens, and commits when focus leaves the cell.
 */
function EditorHost<T extends RowData>({ store, rules, row, columnId, CellEditor, label }: EditorHostProps<T>) {
  const editing = useSyncExternalStore(
    store.subscribe,
    () => store.getState().editing,
    () => null,
  ) as SpreadsheetEditing;
  const host = useRef<HTMLDivElement>(null);
  const value = row.getValue<CellData>(columnId);
  const editor = rules.editorFor(value);

  const [text, setText] = useState(() => editing.text ?? rules.format(value, row.original));
  const [draft, setDraft] = useState<CellData>(() => {
    if (editing.text === null) return value;
    const parsed = rules.parse(editing.text, row.original, value);
    return parsed.ok ? parsed.value : value;
  });
  const latest = useRef({ text, draft });
  latest.current = { text, draft };

  useIsomorphicLayoutEffect(() => {
    const read = () =>
      editor.kind === "custom"
        ? { kind: "value" as const, value: latest.current.draft }
        : { kind: "text" as const, text: latest.current.text };
    store.draft = read;
    return () => {
      if (store.draft === read) store.draft = null;
    };
  }, [store, editor.kind]);

  /** Focus goes into the editor when it opens: the caret after the text, or all of it selected after a click. */
  useIsomorphicLayoutEffect(() => {
    const target = host.current?.querySelector<HTMLElement>(
      "input, select, textarea, button, [tabindex]:not([tabindex='-1'])",
    );
    if (!target) return;
    target.focus({ preventScroll: true });
    if (target instanceof HTMLInputElement && target.type === "text") {
      if (editing.caret === "all") target.select();
      else target.setSelectionRange(target.value.length, target.value.length);
    }
  }, []);

  /** Focus leaving the cell (not moving into the editor's own popup) commits, without taking focus back. */
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && host.current?.contains(next)) return;
    if (next instanceof Element && next.closest("[data-column-id]") === host.current?.closest("[data-column-id]")) return;
    if (store.getState().editing) store.actions.commit("none", undefined, false);
  };

  const commitText = (override?: string) =>
    store.actions.commit("none", override === undefined ? undefined : { kind: "text", text: override });
  const common = {
    "aria-label": label,
    error: editing.error,
    onCommit: commitText,
    onCancel: store.actions.cancel,
  };

  let control: ReactNode;
  if (editor.kind === "custom") {
    const { Component } = editor;
    control = (
      <Component
        value={draft}
        onValueChange={setDraft}
        commit={(...picked: [CellData?]) =>
          store.actions.commit("none", { kind: "value", value: picked.length ? picked[0] : latest.current.draft })
        }
        cancel={store.actions.cancel}
        row={row.original}
        columnId={columnId}
        error={editing.error}
        aria-label={label}
      />
    );
  } else if (editor.kind === "select") {
    control = (
      <CellEditor
        {...common}
        kind="select"
        value={rules.format(value, row.original)}
        options={rules.options.map((option) => option.label)}
        search={editing.text ?? ""}
      />
    );
  } else if (editor.kind === "date") {
    control = <CellEditor {...common} kind="date" value={text} onValueChange={setText} />;
  } else {
    control = (
      <CellEditor {...common} kind={editor.kind === "number" ? "number" : "text"} value={text} onValueChange={setText} />
    );
  }

  return (
    <div ref={host} className={cx(classes.editorHost)} style={HOST_LAYOUT} onBlur={onBlur}>
      {control}
    </div>
  );
}

/**
 * Spreadsheet announcer
 *
 * The live region that reads copies, pastes, fills and undos aloud. It is
 * the only part that re-renders for an announcement.
 *
 * @internal
 */
export function SpreadsheetAnnouncer({ store }: { store: SpreadsheetStore }) {
  const announcement = useSyncExternalStore(
    store.subscribe,
    () => store.getState().announcement,
    () => "",
  );
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={classes.srOnly} style={VISUALLY_HIDDEN}>
      {announcement}
    </div>
  );
}
