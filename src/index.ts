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
 * - `locale` — `defineLocale`; the ready-made packs are their own entry
 *   points (`slotsmith/locales/ar`), not re-exported here.
 * - `provider` — `SlotsmithProvider`, the home of any setting shared across
 *   components: the locale, and slot overrides for every component below it.
 *
 * @example
 * ```tsx
 * import { DataTable, DatePicker, FileUploader } from "slotsmith";
 * import "slotsmith/styles.css";
 * ```
 *
 * @packageDocumentation
 */

/**
 * Each path names the folder's `index` in full. The build also writes a script
 * per entry (`dist/autocomplete.js`) beside the folder of the same name, and a
 * type checker reading `./autocomplete` from the declarations finds that
 * script first and loses every type behind it.
 */
export * from "./autocomplete/index";
export * from "./data-table/index";
export * from "./date-picker/index";
export * from "./file-uploader/index";
export * from "./locale/index";
export * from "./provider/index";
