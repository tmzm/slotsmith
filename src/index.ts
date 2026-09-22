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
 *
 * @example
 * ```tsx
 * import { DataTable } from "slotsmith";
 * import "slotsmith/styles.css";
 *
 * <DataTable data={users} columns={columns} />;
 * ```
 *
 * @packageDocumentation
 */

export * from "./data-table";
