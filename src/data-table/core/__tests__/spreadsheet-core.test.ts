import { describe, expect, it } from "vitest";
import { parseTSV, pasteTargets, toHTMLTable, toTSV } from "../spreadsheet/clipboard";
import { fillValues } from "../spreadsheet/fill";
import { boundsOf, fillBounds, movePoint, type GridPoint } from "../spreadsheet/grid";
import { emptyHistory, record, redo, undo } from "../spreadsheet/history";
import { setPath } from "../spreadsheet/columnEdit";

const size = { rows: 5, columns: 4 };
const options = { jump: false, pageRows: 2, rtl: false, isEmpty: () => false };

describe("movePoint", () => {
  it("steps and stays inside the grid", () => {
    expect(movePoint(size, { row: 0, column: 0 }, "ArrowUp", options)).toEqual({ row: 0, column: 0 });
    expect(movePoint(size, { row: 0, column: 0 }, "ArrowDown", options)).toEqual({ row: 1, column: 0 });
    expect(movePoint(size, { row: 4, column: 3 }, "ArrowRight", options)).toEqual({ row: 4, column: 3 });
  });

  it("swaps the horizontal arrows right to left", () => {
    expect(movePoint(size, { row: 0, column: 1 }, "ArrowLeft", { ...options, rtl: true })).toEqual({ row: 0, column: 2 });
  });

  it("goes to the row's ends, or the grid's corners with Ctrl", () => {
    expect(movePoint(size, { row: 2, column: 1 }, "End", options)).toEqual({ row: 2, column: 3 });
    expect(movePoint(size, { row: 2, column: 1 }, "Home", { ...options, jump: true })).toEqual({ row: 0, column: 0 });
    expect(movePoint(size, { row: 2, column: 1 }, "End", { ...options, jump: true })).toEqual({ row: 4, column: 3 });
  });

  it("pages by pageRows", () => {
    expect(movePoint(size, { row: 1, column: 1 }, "PageDown", options)).toEqual({ row: 3, column: 1 });
    expect(movePoint(size, { row: 1, column: 1 }, "PageUp", options)).toEqual({ row: 0, column: 1 });
  });

  it("jumps to the edge of the data with Ctrl", () => {
    // Column 0 holds values in rows 0-1 and 3; row 2 and 4 are empty.
    const filled = new Set(["0,0", "1,0", "3,0"]);
    const isEmpty = (point: GridPoint) => !filled.has(`${point.row},${point.column}`);
    const jump = { ...options, jump: true, isEmpty };
    expect(movePoint(size, { row: 0, column: 0 }, "ArrowDown", jump)).toEqual({ row: 1, column: 0 });
    expect(movePoint(size, { row: 1, column: 0 }, "ArrowDown", jump)).toEqual({ row: 3, column: 0 });
    expect(movePoint(size, { row: 3, column: 0 }, "ArrowDown", jump)).toEqual({ row: 4, column: 0 });
  });
});

describe("fillBounds", () => {
  const from = boundsOf({ row: 1, column: 1 }, { row: 2, column: 1 });

  it("grows along the axis the pointer left furthest on", () => {
    expect(fillBounds(from, { row: 4, column: 2 })).toEqual({ top: 1, bottom: 4, left: 1, right: 1 });
    expect(fillBounds(from, { row: 2, column: 3 })).toEqual({ top: 1, bottom: 2, left: 1, right: 3 });
    expect(fillBounds(from, { row: 0, column: 1 })).toEqual({ top: 0, bottom: 2, left: 1, right: 1 });
  });

  it("is null inside the selection", () => {
    expect(fillBounds(from, { row: 2, column: 1 })).toBeNull();
  });
});

describe("clipboard", () => {
  it("round-trips cells with tabs, line breaks and quotes", () => {
    const cells = [
      ["a", "b\tc"],
      ['say "hi"', "two\nlines"],
    ];
    expect(parseTSV(toTSV(cells))).toEqual(cells);
  });

  it("reads spreadsheet text with CRLF and a trailing line break", () => {
    expect(parseTSV("1\t2\r\n3\t4\r\n")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("escapes HTML", () => {
    expect(toHTMLTable([["<b>&"]])).toBe("<table><tr><td>&lt;b&gt;&amp;</td></tr></table>");
  });

  it("pastes a block at its own size, clipped to the grid", () => {
    const targets = pasteTargets({ top: 3, bottom: 3, left: 2, right: 2 }, [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]], size);
    expect(targets.map((t) => `${t.point.row},${t.point.column}=${t.text}`)).toEqual(["3,2=a", "3,3=b", "4,2=d", "4,3=e"]);
  });

  it("tiles a block over a selection that is a multiple of it", () => {
    const targets = pasteTargets({ top: 0, bottom: 2, left: 0, right: 1 }, [["x"]], size);
    expect(targets).toHaveLength(6);
    expect(targets.every((t) => t.text === "x")).toBe(true);
  });
});

describe("fillValues", () => {
  it("continues a number series", () => {
    expect(fillValues([1, 3], 3, 1)).toEqual([5, 7, 9]);
    expect(fillValues([1, 3], 2, -1)).toEqual([-1, -3]);
  });

  it("repeats a single number", () => {
    expect(fillValues([4], 2, 1)).toEqual([4, 4]);
  });

  it("counts on numbered text, keeping its padding", () => {
    expect(fillValues(["Item 9"], 2, 1)).toEqual(["Item 10", "Item 11"]);
    expect(fillValues(["A-008", "A-010"], 2, 1)).toEqual(["A-012", "A-014"]);
  });

  it("repeats anything else, in both directions", () => {
    expect(fillValues(["a", "b"], 3, 1)).toEqual(["a", "b", "a"]);
    expect(fillValues(["a", "b"], 3, -1)).toEqual(["b", "a", "b"]);
  });
});

describe("history", () => {
  const edit = { rowId: "r1", columnId: "name", before: "a", after: "b" };

  it("undoes and redoes", () => {
    const history = record(emptyHistory<string>(), [edit], 10);
    const undone = undo(history)!;
    expect(undone.change).toEqual([{ ...edit, before: "b", after: "a" }]);
    const redone = redo(undone.history)!;
    expect(redone.change).toEqual([edit]);
    expect(undo(emptyHistory())).toBeNull();
  });

  it("drops the oldest change past the limit and clears redo on a new change", () => {
    let history = emptyHistory<string>();
    for (let n = 0; n < 4; n++) history = record(history, [{ ...edit, after: String(n) }], 2);
    expect(history.past).toHaveLength(2);
    history = undo(history)!.history;
    history = record(history, [edit], 2);
    expect(history.future).toHaveLength(0);
  });
});

describe("setPath", () => {
  it("copies along a dotted path and shares the rest", () => {
    const row = { a: { b: 1, c: [1] }, d: { e: 2 } };
    const next = setPath(row, ["a", "b"], 5);
    expect(next).toEqual({ a: { b: 5, c: [1] }, d: { e: 2 } });
    expect(next.d).toBe(row.d);
    expect(next.a.c).toBe(row.a.c);
    expect(row.a.b).toBe(1);
  });
});
