/**
 * slotsmith
 *
 * A headless React component library. Every part of every component is a slot
 * you can replace, and anything you don't replace renders as plain, accessible
 * HTML that is already finished.
 *
 * Components live in their own folder and are re-exported here:
 *
 * - `autocomplete` — a combobox that is also a select, local or remote.
 * - `data-table` — the data table, on TanStack Table v9.
 * - `date-picker` — one date, several dates or a range, on `YYYY-MM-DD` strings.
 * - `file-uploader` — drop zone, image previews, upload queue, or picker-only.
 *
 * @example
 * ```tsx
 * import { DataTable, DatePicker, FileUploader } from "slotsmith";
 * import "slotsmith/styles.css";
 * ```
 *
 * @packageDocumentation
 */

export * from "./autocomplete";
export * from "./data-table";
export * from "./date-picker";
export * from "./file-uploader";
