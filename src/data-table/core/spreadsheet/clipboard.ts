import { sizeOf, type GridBounds, type GridPoint } from "./grid";

/** Whether a cell's text needs quoting in TSV: a tab, a line break or a quote. */
const needsQuotes = (text: string) => /[\t\n\r"]/.test(text);

/**
 * To TSV
 *
 * Tab-separated text, the format spreadsheets put on the clipboard. A cell
 * holding a tab, a line break or a quote is quoted, its quotes doubled.
 *
 * @param rows - The cells' text, row by row.
 * @returns The text.
 *
 * @example
 * ```ts
 * toTSV([["a", "b"], ["c", 'say "hi"']]); // 'a\tb\nc\t"say ""hi"""'
 * ```
 */
export function toTSV(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) => row.map((cell) => (needsQuotes(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join("\t"))
    .join("\n");
}

const escapeHTML = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * To HTML table
 *
 * The same cells as an HTML table, which word processors and spreadsheets
 * paste as a grid.
 *
 * @param rows - The cells' text, row by row.
 * @returns The markup.
 */
export function toHTMLTable(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHTML(cell).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${body}</table>`;
}

/**
 * Parse TSV
 *
 * Reads clipboard text into rows of cells: tabs split cells, line breaks
 * split rows, quoted cells may hold either. One trailing line break, which
 * spreadsheets add, is dropped.
 *
 * @param text - The clipboard text.
 * @returns The cells' text, row by row; at least one row of one cell.
 *
 * @example
 * ```ts
 * parseTSV('a\tb\r\n"two\nlines"\tc\r\n'); // [["a", "b"], ["two\nlines", "c"]]
 * ```
 */
export function parseTSV(text: string): string[][] {
  const source = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let index = 0;
  let quoted = false;
  let atCellStart = true;

  while (index < source.length) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        quoted = false;
        index++;
        continue;
      }
      cell += char;
      index++;
      continue;
    }
    if (char === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
      index++;
      continue;
    }
    if (char === "\t") {
      row.push(cell);
      cell = "";
      atCellStart = true;
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
    } else {
      cell += char;
      atCellStart = false;
    }
    index++;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

/** One cell a paste writes. */
export interface PasteTarget {
  point: GridPoint;
  text: string;
}

/**
 * Paste targets
 *
 * Where pasted cells land. A block pastes from the selection's top start
 * corner at its own size; when the selection is a whole multiple of the block
 * (one copied cell into many, or a row into several rows), the block repeats
 * to fill it. Cells past the grid's edge are dropped.
 *
 * @param selection - The selection pasted into.
 * @param clip - The pasted cells, row by row.
 * @param size - How many rows and columns the grid has.
 * @returns Every cell to write, row by row.
 */
export function pasteTargets(
  selection: GridBounds,
  clip: readonly (readonly string[])[],
  size: { rows: number; columns: number },
): PasteTarget[] {
  const clipRows = clip.length;
  const clipColumns = Math.max(...clip.map((row) => row.length));
  const selected = sizeOf(selection);
  const tiles = selected.rows % clipRows === 0 && selected.columns % clipColumns === 0;
  const rows = tiles ? selected.rows : clipRows;
  const columns = tiles ? selected.columns : clipColumns;

  const targets: PasteTarget[] = [];
  for (let r = 0; r < rows; r++) {
    const row = selection.top + r;
    if (row >= size.rows) break;
    for (let c = 0; c < columns; c++) {
      const column = selection.left + c;
      if (column >= size.columns) break;
      targets.push({ point: { row, column }, text: clip[r % clipRows]![c % clipColumns] ?? "" });
    }
  }
  return targets;
}
