import type { DataTableLabels } from "../slots/types";

/**
 * Reorder labels
 *
 * The labels the row-reorder engine reads: the handle's name, its keyboard
 * instructions, and the announcements.
 */
export type ReorderLabels = Pick<
  DataTableLabels,
  "reorderRow" | "reorderInstructions" | "reorderLifted" | "reorderMoved" | "reorderDropped" | "reorderCancelled"
>;

/**
 * Default reorder labels
 *
 * The English reorder text. It lives apart from the other defaults so the
 * headless hook can fall back to it without importing the fallback slots.
 */
export const defaultReorderLabels: ReorderLabels = {
  reorderRow: "Reorder row",
  reorderInstructions: "Press space to lift the row, the arrow keys to move it, space to drop it, escape to cancel.",
  reorderLifted: (position, total) => `Row lifted. Position ${position} of ${total}.`,
  reorderMoved: (position, total) => `Position ${position} of ${total}.`,
  reorderDropped: (position, total) => `Row dropped at position ${position} of ${total}.`,
  reorderCancelled: "Reordering cancelled.",
};
