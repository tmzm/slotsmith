import type { CellData, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { DataTableLabels } from "../../slots/types";
import type { DataTableColumnDef, DataTableRow } from "../features";
import type {
  DataTableColumnEdit,
  DataTableColumnEditInput,
  DataTableColumnEditorProps,
  DataTableEditOption,
  DataTableEditorKind,
} from "./types";

/**
 * Resolved editor
 *
 * The editor a cell gets: a built-in kind, or the column's own component.
 */
export type ResolvedEditor<T> =
  | { kind: Exclude<DataTableEditorKind, "checkbox"> }
  | { kind: "checkbox" }
  | { kind: "custom"; Component: (props: DataTableColumnEditorProps<T, CellData>) => ReactNode };

/** A parsed value, or why the text could not be read. */
export type ParseResult = { ok: true; value: CellData } | { ok: false; error: string };

/** The labels the editing rules read. */
export type EditLabels = Pick<DataTableLabels, "invalidNumber" | "invalidOption" | "invalidDate" | "invalidBoolean">;

/**
 * Column editing
 *
 * One column's editing rules with every default filled in. Values are the
 * column's own type at the edges (the `edit` functions the app wrote); in
 * here the columns of a row are handled together, so they are `CellData`.
 *
 * @typeParam T - The row data type.
 */
export interface ColumnEditing<T extends RowData> {
  columnId: string;
  /** Whether a row's cell can be edited. */
  isEditable: (row: DataTableRow<T>) => boolean;
  /** The editor for a cell holding `value`. */
  editorFor: (value: CellData) => ResolvedEditor<T>;
  /** The choices of a select column, keyed by position for the editors. */
  options: readonly DataTableEditOption<CellData>[];
  parse: (text: string, row: T, value: CellData) => ParseResult;
  format: (value: CellData, row: T) => string;
  validate: (value: CellData, row: T) => string | null;
  setValue: (row: T, value: CellData) => T;
  /** The value Delete writes. */
  empty: (row: T, value: CellData) => ParseResult;
}

/** The `edit` field of a column, read off any column definition. */
export function editInputOf<T extends RowData>(
  columnDef: DataTableColumnDef<T>,
): DataTableColumnEditInput<T, CellData> | undefined {
  return (columnDef as { edit?: DataTableColumnEditInput<T, CellData> }).edit;
}

/** The `accessorKey` of a column, when it has one. */
const accessorKeyOf = (columnDef: object): string | undefined => {
  const key = (columnDef as { accessorKey?: string | number | symbol }).accessorKey;
  return typeof key === "string" || typeof key === "number" ? String(key) : undefined;
};

/**
 * Set path
 *
 * Copies a row with the value at a dotted path replaced, copying each object
 * or array along the way and leaving the rest shared.
 */
export function setPath<T>(row: T, path: readonly string[], value: CellData): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path as [string, ...string[]];
  const current = (row as Record<string, unknown> | null | undefined)?.[head];
  const next = setPath(current, rest, value);
  if (Array.isArray(row)) {
    const copy = row.slice();
    copy[Number(head)] = next;
    return copy as T;
  }
  return { ...(row as object), [head]: next } as T;
}

const TRUE_WORDS = /^(true|yes|y|on|1|x|✓)$/i;
const FALSE_WORDS = /^(false|no|n|off|0|)$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A date's ISO day (`YYYY-MM-DD`) in local time. */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Whether an ISO day exists on the calendar (rejects `2026-02-31`). */
const realDay = (text: string) => {
  const [year, month, day] = text.split("-").map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const sameOption = (a: CellData, b: CellData) => Object.is(a, b) || String(a) === String(b);

/**
 * Resolve column editing
 *
 * @param columnId - The column's id.
 * @param columnDef - Its definition.
 * @param labels - The validation messages.
 * @param canWriteSubRows - Whether sub-rows can be written (`setSubRows` was given).
 * @returns The column's editing rules; `null` for a read-only column, or one
 *   that cannot be written (an `accessorFn` column without `setValue`).
 */
export function resolveColumnEditing<T extends RowData>(
  columnId: string,
  columnDef: DataTableColumnDef<T>,
  labels: EditLabels,
  canWriteSubRows: boolean,
): ColumnEditing<T> | null {
  const input = editInputOf(columnDef);
  if (!input) return null;
  const edit: DataTableColumnEdit<T, CellData> = input === true ? {} : input;

  const accessorKey = accessorKeyOf(columnDef);
  const writer =
    edit.setValue ?? (accessorKey !== undefined ? (row: T, value: CellData) => setPath(row, accessorKey.split("."), value) : null);
  if (!writer) return null;

  const options = edit.options ?? [];
  const custom = edit.component ?? null;

  const kindOf = (value: CellData): DataTableEditorKind | "custom" => {
    if (custom) return "custom";
    if (edit.editor) return edit.editor;
    if (edit.options) return "select";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox";
    return "text";
  };

  const parseAs = (kind: DataTableEditorKind | "custom", text: string): ParseResult => {
    const trimmed = text.trim();
    switch (kind) {
      case "number": {
        const value = trimmed === "" ? Number.NaN : Number(trimmed);
        return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: labels.invalidNumber };
      }
      case "checkbox":
        if (TRUE_WORDS.test(trimmed)) return { ok: true, value: true };
        if (FALSE_WORDS.test(trimmed)) return { ok: true, value: false };
        return { ok: false, error: labels.invalidBoolean };
      case "select": {
        const match = options.find(
          (option) =>
            option.label.trim().toLowerCase() === trimmed.toLowerCase() || String(option.value) === trimmed,
        );
        return match ? { ok: true, value: match.value } : { ok: false, error: labels.invalidOption };
      }
      case "date": {
        if (trimmed === "") return { ok: true, value: null };
        if (ISO_DATE.test(trimmed)) {
          return realDay(trimmed) ? { ok: true, value: trimmed } : { ok: false, error: labels.invalidDate };
        }
        const time = Date.parse(trimmed);
        return Number.isNaN(time) ? { ok: false, error: labels.invalidDate } : { ok: true, value: isoDay(new Date(time)) };
      }
      default:
        return { ok: true, value: text };
    }
  };

  const validate = (value: CellData, row: T) => edit.validate?.(value, row) ?? null;

  const parse = (text: string, row: T, current: CellData): ParseResult => {
    if (edit.parse) return { ok: true, value: edit.parse(text, row) };
    return parseAs(kindOf(current), text);
  };

  return {
    columnId,
    isEditable: (row) =>
      (row.depth === 0 || canWriteSubRows) && (edit.editable ? edit.editable(row.original) : true),
    editorFor: (value) => {
      const kind = kindOf(value);
      return kind === "custom" ? { kind, Component: custom! } : { kind };
    },
    options,
    parse,
    format: (value, row) => {
      if (edit.format) return edit.format(value, row);
      if (value === null || value === undefined) return "";
      if (edit.options) return options.find((option) => sameOption(option.value, value))?.label ?? String(value);
      if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
      return String(value);
    },
    validate,
    setValue: writer,
    empty: (row, current) => ("empty" in edit ? { ok: true, value: edit.empty } : parse("", row, current)),
  };
}
