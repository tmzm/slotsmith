import { describe, expect, it } from "vitest";
import { canReorder, dropTargetAt, landingIndex, moveItem, rowOffsets, scrollSpeed, stepTarget } from "../reorder";

const items = ["a", "b", "c", "d"];

describe("moveItem", () => {
  it("moves down, after the target", () => expect(moveItem(items, 0, 2, "after")).toEqual(["b", "c", "a", "d"]));
  it("moves down, before the target", () => expect(moveItem(items, 0, 2, "before")).toEqual(["b", "a", "c", "d"]));
  it("moves up, before the target", () => expect(moveItem(items, 3, 1, "before")).toEqual(["a", "d", "b", "c"]));
  it("moves up, after the target", () => expect(moveItem(items, 3, 1, "after")).toEqual(["a", "b", "d", "c"]));
  it("moves to the very end", () => expect(moveItem(items, 0, 3, "after")).toEqual(["b", "c", "d", "a"]));
  it("moves to the very start", () => expect(moveItem(items, 3, 0, "before")).toEqual(["d", "a", "b", "c"]));
  it("returns an equal copy when dropped on itself", () => {
    const out = moveItem(items, 1, 1, "after");
    expect(out).toEqual(items);
    expect(out).not.toBe(items);
  });
  it("returns an equal copy for a move that changes nothing", () => {
    expect(moveItem(items, 0, 1, "before")).toEqual(items);
    expect(moveItem(items, 1, 0, "after")).toEqual(items);
  });
  it("returns an equal copy for an index out of range", () => {
    expect(moveItem(items, -1, 2, "after")).toEqual(items);
    expect(moveItem(items, 0, 9, "after")).toEqual(items);
  });
  it("does not change its input", () => {
    moveItem(items, 0, 3, "after");
    expect(items).toEqual(["a", "b", "c", "d"]);
  });
});

const rects = [
  { id: "a", top: 0, bottom: 40 },
  { id: "b", top: 40, bottom: 80 },
  { id: "c", top: 80, bottom: 120 },
];

describe("dropTargetAt", () => {
  it("is before a row in its upper half", () => expect(dropTargetAt(rects, 45)).toEqual({ id: "b", position: "before" }));
  it("is after a row in its lower half", () => expect(dropTargetAt(rects, 70)).toEqual({ id: "b", position: "after" }));
  it("is before the first row above the list", () => expect(dropTargetAt(rects, -50)).toEqual({ id: "a", position: "before" }));
  it("is after the last row below the list", () => expect(dropTargetAt(rects, 900)).toEqual({ id: "c", position: "after" }));
  it("is nothing with no rows", () => expect(dropTargetAt([], 10)).toBeNull());
});

describe("stepTarget", () => {
  const ids = ["a", "b", "c", "d"];
  it("starts one row down from the lifted row", () =>
    expect(stepTarget(ids, "b", null, 1)).toEqual({ id: "c", position: "after" }));
  it("starts one row up from the lifted row", () =>
    expect(stepTarget(ids, "b", null, -1)).toEqual({ id: "a", position: "before" }));
  it("keeps stepping from the current target", () =>
    expect(stepTarget(ids, "a", { id: "b", position: "after" }, 1)).toEqual({ id: "c", position: "after" }));
  it("stops at the last row", () =>
    expect(stepTarget(ids, "a", { id: "d", position: "after" }, 1)).toEqual({ id: "d", position: "after" }));
  it("stops at the first row", () =>
    expect(stepTarget(ids, "d", { id: "a", position: "before" }, -1)).toEqual({ id: "a", position: "before" }));
  it("returns to the lifted row's own place as no target", () =>
    expect(stepTarget(ids, "b", { id: "c", position: "after" }, -1)).toBeNull());
  it("is nothing for a single row", () => expect(stepTarget(["a"], "a", null, 1)).toBeNull());
});

describe("landingIndex", () => {
  const ids = ["a", "b", "c", "d"];
  it("counts from zero, after removing the dragged row", () => {
    expect(landingIndex(ids, "a", { id: "c", position: "after" })).toBe(2);
    expect(landingIndex(ids, "d", { id: "a", position: "before" })).toBe(0);
    expect(landingIndex(ids, "d", { id: "b", position: "after" })).toBe(2);
  });
});

describe("rowOffsets", () => {
  // Rows of different heights: a is 40 tall, b 60, c 40, d 20.
  const mixed = [
    { id: "a", top: 0, bottom: 40 },
    { id: "b", top: 40, bottom: 100 },
    { id: "c", top: 100, bottom: 140 },
    { id: "d", top: 140, bottom: 160 },
  ];
  const entries = (map: Map<string, number>) => Object.fromEntries(map);

  it("is empty with no target", () => expect(entries(rowOffsets(mixed, "a", null))).toEqual({}));
  it("is empty for a row that is not rendered", () =>
    expect(entries(rowOffsets(mixed, "z", { id: "b", position: "after" }))).toEqual({}));
  it("moving down: the rows passed slide up by the dragged row's height", () => {
    expect(entries(rowOffsets(mixed, "a", { id: "c", position: "after" }))).toEqual({ a: 100, b: -40, c: -40 });
  });
  it("moving up: the rows passed slide down by the dragged row's height", () => {
    expect(entries(rowOffsets(mixed, "d", { id: "b", position: "before" }))).toEqual({ d: -100, b: 20, c: 20 });
  });
  it("leaves the rows outside the move where they are", () => {
    expect(rowOffsets(mixed, "b", { id: "c", position: "after" }).has("a")).toBe(false);
    expect(rowOffsets(mixed, "b", { id: "c", position: "after" }).has("d")).toBe(false);
  });
  it("moves nothing for a target that is the row's own place", () => {
    expect(entries(rowOffsets(mixed, "b", { id: "a", position: "after" }))).toEqual({ b: 0 });
    expect(entries(rowOffsets(mixed, "b", { id: "c", position: "before" }))).toEqual({ b: 0 });
  });
});

describe("canReorder", () => {
  const on = { enabled: true, hasSubRows: false, virtual: false, rowCount: 5 };
  it("is on for a flat table with rows", () => expect(canReorder(on)).toBe(true));
  it("is off when not enabled", () => expect(canReorder({ ...on, enabled: false })).toBe(false));
  it("is off for a tree table", () => expect(canReorder({ ...on, hasSubRows: true })).toBe(false));
  it("is off for a virtual table", () => expect(canReorder({ ...on, virtual: true })).toBe(false));
  it("is off with fewer than two rows", () => expect(canReorder({ ...on, rowCount: 1 })).toBe(false));
});

describe("scrollSpeed", () => {
  it("is zero away from the edges", () => expect(scrollSpeed(200, 0, 400)).toBe(0));
  it("is negative near the top, faster the closer it gets", () => {
    expect(scrollSpeed(30, 0, 400)).toBeLessThan(0);
    expect(scrollSpeed(5, 0, 400)).toBeLessThan(scrollSpeed(30, 0, 400));
  });
  it("is positive near the bottom", () => expect(scrollSpeed(390, 0, 400)).toBeGreaterThan(0));
  it("never exceeds the maximum", () => {
    expect(scrollSpeed(-500, 0, 400, 40, 16)).toBe(-16);
    expect(scrollSpeed(5000, 0, 400, 40, 16)).toBe(16);
  });
});
