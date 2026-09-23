/**
 * slotsmith
 *
 * A headless React component library. Every part of every component is a slot
 * you can replace, and anything you don't replace renders as plain, accessible
 * HTML that is already finished.
 *
 * Components live in their own folder and are re-exported here:
 *
 * - `data-table` — the data table, on TanStack Table v9.
 * - `file-uploader` — drop zone, image previews, upload queue, or picker-only.
 *
 * @example
 * ```tsx
 * import { DataTable, FileUploader } from "slotsmith";
 * import "slotsmith/styles.css";
 * ```
 *
 * @packageDocumentation
 */

export * from "./data-table";
export * from "./file-uploader";
