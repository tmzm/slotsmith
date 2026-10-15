import type { ComponentType, ReactNode } from "react";
import type { LocaleInput } from "../../../locale/types";

/**
 * Editor kind
 *
 * The built-in editors a column can use. `"text"` and `"number"` edit the
 * cell as text; `"select"` picks one of the column's `options` with the
 * slotsmith `Autocomplete`; `"date"` picks an ISO date (`YYYY-MM-DD`) with
 * the slotsmith `DatePicker`; `"checkbox"` toggles a boolean in place, with
 * no editor.
 */
export type DataTableEditorKind = "text" | "number" | "select" | "date" | "checkbox";

/**
 * Edit option
 *
 * One choice of a `"select"` column.
 *
 * @typeParam TValue - The column's value type.
 */
export interface DataTableEditOption<TValue> {
  /** The value written to the row. */
  value: TValue;
  /** The text shown, copied and matched when pasting. */
  label: string;
}

/**
 * Column editor props
 *
 * What a column's own editor component receives (`edit.editor` set to a
 * component). The draft is the column's own value type, not text.
 *
 * @typeParam T - The row data type.
 * @typeParam TValue - The column's value type.
 *
 * @example
 * ```tsx
 * function RatingEditor({ value, onValueChange, commit }: DataTableColumnEditorProps<Product, number>) {
 *   return (
 *     <input type="range" min={0} max={5} value={value} autoFocus
 *       onChange={(event) => onValueChange(Number(event.target.value))}
 *       onPointerUp={() => commit()} />
 *   );
 * }
 * ```
 */
export interface DataTableColumnEditorProps<T, TValue> {
  /** The draft value. */
  value: TValue;
  /** Replaces the draft. */
  onValueChange: (value: TValue) => void;
  /** Ends the edit and writes the draft, or `value` when given. */
  commit: (value?: TValue) => void;
  /** Ends the edit without writing anything. */
  cancel: () => void;
  /** The row being edited. */
  row: T;
  /** The column being edited. */
  columnId: string;
  /** The validation message of the last commit, or `null`. */
  error: string | null;
  /** The editor's accessible name, from the `editCell` label. */
  "aria-label": string;
}

/**
 * Column edit options
 *
 * How the cells of one column are edited in spreadsheet mode, set as the
 * column's `edit`. Every function is typed by the column's value: for an
 * `accessorKey` column that is the type of the field it reads. They are
 * methods, so a column built for a narrower value still fits a list of columns.
 *
 * @typeParam T - The row data type.
 * @typeParam TValue - The column's value type.
 *
 * @example
 * ```tsx
 * const columns: DataTableColumnDef<Product>[] = [
 *   {
 *     accessorKey: "price",
 *     header: "Price",
 *     edit: {
 *       parse: (text) => Number(text.replace(/[^\d.-]/g, "")),
 *       format: (price) => price.toFixed(2),
 *       validate: (price) => (price < 0 ? "Must be positive" : null),
 *     },
 *   },
 * ];
 * ```
 */
export interface DataTableColumnEdit<T, TValue> {
  /** Decides per row whether its cell can be edited. Defaults to every row. */
  editable?(row: T): boolean;
  /**
   * The built-in editor. Defaults to `"select"` when `options` is set,
   * otherwise to the kind that fits the cell's current value (`"number"`,
   * `"checkbox"` for booleans, else `"text"`). Ignored when `component` is set.
   */
  editor?: DataTableEditorKind;
  /**
   * Your own editor, a function component that edits the column's value
   * directly (see {@link DataTableColumnEditorProps}). Wins over `editor`.
   */
  component?(props: DataTableColumnEditorProps<T, TValue>): ReactNode;
  /** The choices of a `"select"` column. */
  options?: readonly DataTableEditOption<TValue>[];
  /**
   * Text to value, for typing and pasting. Defaults to the text itself, a
   * number for `"number"`, the matching option for `"select"` and
   * `true`/`false` words for `"checkbox"`.
   */
  parse?(text: string, row: T): TValue;
  /** Value to text, for the editor's start value and for copying. Defaults to `String(value)`. */
  format?(value: TValue, row: T): string;
  /** A message when the value is not allowed, `null` when it is. Invalid pasted or filled cells are skipped. */
  validate?(value: TValue, row: T): string | null;
  /**
   * Writes a value into a row and returns the new row. Needed for an
   * `accessorFn` column; an `accessorKey` column copies the row with the
   * field (or the dotted path) replaced.
   */
  setValue?(row: T, value: TValue): T;
  /** The value Delete writes. Defaults to the parse of an empty string. */
  empty?: TValue;
}

/**
 * Column edit input
 *
 * A column's `edit`: `true` for the defaults, an object to configure them,
 * `false` (or leaving it out) for a read-only column.
 *
 * @typeParam T - The row data type.
 * @typeParam TValue - The column's value type.
 */
export type DataTableColumnEditInput<T, TValue> = boolean | DataTableColumnEdit<T, TValue>;

/**
 * Spreadsheet options
 *
 * The `spreadsheet` option, when an object.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableSpreadsheetOptions<T> {
  /** Undo steps kept. `0` turns undo off. Defaults to `100`. */
  history?: number;
  /** Shows the fill handle on the selection's corner. Defaults to `true`. */
  fillHandle?: boolean;
  /** Where Enter moves after an edit is committed. Defaults to `"down"`. */
  enterMoves?: "down" | "right" | "none";
  /**
   * Writes new children into a tree row and returns the new row. Needed to
   * edit sub-rows (`getSubRows`); without it only top-level rows are editable.
   */
  setSubRows?: (row: T, subRows: T[]) => T;
  /**
   * The date picker for `"date"` cells: the slotsmith `DatePicker`, imported
   * by the app, so a table that edits no dates does not ship it. Without it
   * a date cell is edited with the browser's own `<input type="date">`.
   *
   * @example
   * ```tsx
   * import { DatePicker } from "slotsmith/date-picker";
   *
   * <DataTable spreadsheet={{ datePicker: DatePicker }} />;
   * ```
   */
  datePicker?: SpreadsheetDatePicker;
}

/**
 * Spreadsheet date picker
 *
 * The props a date cell's picker is rendered with. The slotsmith
 * `DatePicker` takes them as they are.
 */
export type SpreadsheetDatePicker = ComponentType<{
  mode: "single";
  /** A cell opens straight onto the calendar, so the picker is a button rather than a text field. */
  trigger: "button";
  /** A date cell holds the calendar day alone. */
  valueFormat: "YYYY-MM-DD";
  /** The ISO date, or `null` when empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  defaultOpen: boolean;
  invalid: boolean;
  className?: string;
  slotProps?: { trigger?: { className?: string } };
  "aria-label": string;
  "aria-describedby"?: string;
  locale?: LocaleInput;
}>;

/**
 * Value change source
 *
 * What produced a value change.
 */
export type DataTableValueChangeSource = "edit" | "paste" | "cut" | "clear" | "fill" | "undo" | "redo";

/**
 * Row change
 *
 * One row a value change touched.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableRowChange<T> {
  /** The row's id. */
  rowId: string;
  /** The row before the change. */
  previous: T;
  /** The row after the change. */
  next: T;
  /** The columns whose cells changed, in the order shown. */
  columnIds: string[];
}

/**
 * Value change
 *
 * The details `onValueChange` receives with the new rows.
 *
 * @typeParam T - The row data type.
 */
export interface DataTableValueChange<T> {
  /** What produced the change. */
  source: DataTableValueChangeSource;
  /** Every row that changed, in the order shown. */
  rows: DataTableRowChange<T>[];
}
