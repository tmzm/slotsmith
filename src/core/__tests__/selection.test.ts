import { describe, expect, it } from "vitest";
import { fromRowSelection, stepBackPageIndex, toRowSelection } from "../selection";

/* ------------------------------------------------------------------ builders */

type User = { id: string; name: string };
const user = (id: string): User => ({ id, name: `User ${id}` });
const key = (row: User) => row.id;
const byId = (rows: User[]) => new Map(rows.map((row) => [row.id, row]));

/* --------------------------------------------------------------------- tests */

describe("toRowSelection", () => {
  it("maps each selected row to a true entry", () => {
    expect(toRowSelection([user("a"), user("c")], key)).toEqual({ a: true, c: true });
  });

  it("returns an empty map for no selection", () => {
    expect(toRowSelection([], key)).toEqual({});
  });
});

describe("fromRowSelection", () => {
  const page = [user("a"), user("b"), user("c")];

  it("resolves newly selected ids to rows from the current page", () => {
    expect(fromRowSelection({ b: true }, byId(page), [], key)).toEqual([page[1]]);
  });

  it("drops rows on the current page that were unselected", () => {
    const next = fromRowSelection({ a: true }, byId(page), [page[0]!, page[2]!], key);
    expect(next.map(key)).toEqual(["a"]);
  });

  it("keeps rows from other pages (manual pagination)", () => {
    const otherPage = user("z");
    const next = fromRowSelection({ z: true, a: true }, byId(page), [otherPage], key);
    expect(next).toEqual([otherPage, page[0]]);
  });

  it("keeps rows from other pages even when the map no longer lists them", () => {
    const otherPage = user("z");
    expect(fromRowSelection({}, byId(page), [otherPage], key)).toEqual([otherPage]);
  });

  it("keeps selection order and swaps stale objects for the fresh ones", () => {
    const stale = { ...page[2]!, name: "old" };
    const next = fromRowSelection({ c: true, a: true }, byId(page), [stale], key);
    expect(next).toEqual([page[2], page[0]]);
  });

  it("ignores ids that match no row", () => {
    expect(fromRowSelection({ ghost: true }, byId(page), [], key)).toEqual([]);
  });
});

describe("stepBackPageIndex", () => {
  it("stays on the first page", () => {
    expect(stepBackPageIndex(0, 3)).toBeNull();
  });

  it("goes back one page", () => {
    expect(stepBackPageIndex(2, 2)).toBe(1);
  });

  it("jumps to the last page when far past it", () => {
    expect(stepBackPageIndex(6, 3)).toBe(2);
  });

  it("goes to the first page when there are no rows at all", () => {
    expect(stepBackPageIndex(4, 0)).toBe(0);
  });

  it("goes back one page when the page count is unknown", () => {
    expect(stepBackPageIndex(4, -1)).toBe(3);
  });
});
