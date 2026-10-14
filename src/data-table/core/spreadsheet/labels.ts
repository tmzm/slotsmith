import type { SpreadsheetLabels } from "./useSpreadsheet";

const cells = (count: number) => (count === 1 ? "1 cell" : `${count} cells`);

/**
 * Default spreadsheet labels
 *
 * The English spreadsheet text. It lives apart from the other defaults so the
 * headless hook can fall back to it without importing the fallback slots.
 */
export const defaultSpreadsheetLabels: SpreadsheetLabels = {
  editCell: (column) => `Edit ${column}`,
  invalidNumber: "Enter a number.",
  invalidOption: "Choose one of the options.",
  invalidDate: "Enter a valid date.",
  invalidBoolean: "Enter TRUE or FALSE.",
  cellsCopied: (count) => `${cells(count)} copied.`,
  cellsCut: (count) => `${cells(count)} cut.`,
  cellsPasted: (count, skipped) =>
    skipped > 0 ? `${cells(count)} pasted, ${skipped} skipped.` : `${cells(count)} pasted.`,
  cellsCleared: (count) => `${cells(count)} cleared.`,
  cellsFilled: (count) => `${cells(count)} filled.`,
  undone: "Undone.",
  redone: "Redone.",
};
