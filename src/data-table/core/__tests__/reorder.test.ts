import { describe, expect, it } from "vitest";
import {
  blockRowOffsets,
  canReorder,
  dropTargetAt,
  landingIndex,
  moveItem,
  rowOffsets,
  scrollSpeed,
  siblingBlocks,
  stepTarget,
  type RowLevel,
  type RowRect,
} from "../reorder";

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
  const on = { enabled: true, virtual: false, rowCount: 5 };
  it("is on for a table with rows, flat or tree", () => expect(canReorder(on)).toBe(true));
  it("is off when not enabled", () => expect(canReorder({ ...on, enabled: false })).toBe(false));
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

/**
 * A visible tree, every row 40 tall:
 *
 *   a        (0-40)
 *     a1     (40-80)
 *     a2     (80-120)
 *       a21  (120-160)
 *     a3     (160-200)
 *   b        (200-240)   collapsed
 *   c        (240-280)
 *     c1     (280-320)
 */
const tree: RowLevel[] = [
  { id: "a", parentId: null, depth: 0 },
  { id: "a1", parentId: "a", depth: 1 },
  { id: "a2", parentId: "a", depth: 1 },
  { id: "a21", parentId: "a2", depth: 2 },
  { id: "a3", parentId: "a", depth: 1 },
  { id: "b", parentId: null, depth: 0 },
  { id: "c", parentId: null, depth: 0 },
  { id: "c1", parentId: "c", depth: 1 },
];
const treeRects: RowRect[] = tree.map((row, index) => ({ id: row.id, top: index * 40, bottom: index * 40 + 40 }));

describe("siblingBlocks", () => {
  it("groups top-level rows with their expanded subtrees", () => {
    expect(siblingBlocks(tree, treeRects, "b")).toEqual([
      { id: "a", top: 0, bottom: 200, ids: ["a", "a1", "a2", "a21", "a3"] },
      { id: "b", top: 200, bottom: 240, ids: ["b"] },
      { id: "c", top: 240, bottom: 320, ids: ["c", "c1"] },
    ]);
  });

  it("takes only the dragged row's siblings, each with its own subtree", () => {
    expect(siblingBlocks(tree, treeRects, "a1")).toEqual([
      { id: "a1", top: 40, bottom: 80, ids: ["a1"] },
      { id: "a2", top: 80, bottom: 160, ids: ["a2", "a21"] },
      { id: "a3", top: 160, bottom: 200, ids: ["a3"] },
    ]);
  });

  it("ends a last child's block where a shallower row starts", () => {
    expect(siblingBlocks(tree, treeRects, "a2").at(-1)).toEqual({ id: "a3", top: 160, bottom: 200, ids: ["a3"] });
  });

  it("makes a collapsed parent a block of one row", () => {
    expect(siblingBlocks(tree, treeRects, "a").find((block) => block.id === "b")?.ids).toEqual(["b"]);
  });

  it("gives an only child a single block", () => {
    expect(siblingBlocks(tree, treeRects, "c1")).toEqual([{ id: "c1", top: 280, bottom: 320, ids: ["c1"] }]);
  });

  it("is empty for a row that is not rendered", () => expect(siblingBlocks(tree, treeRects, "z")).toEqual([]));

  it("is one block per row in a flat table, equal to the rows' rects", () => {
    const flat = rects.map((rect) => ({ id: rect.id, parentId: null, depth: 0 }));
    const blocks = siblingBlocks(flat, rects, "b");
    expect(blocks.map(({ id, top, bottom }) => ({ id, top, bottom }))).toEqual(rects);
    expect(blocks.map((block) => block.ids)).toEqual([["a"], ["b"], ["c"]]);
  });
});

describe("reordering over blocks", () => {
  const top = siblingBlocks(tree, treeRects, "a");
  const nested = siblingBlocks(tree, treeRects, "a1");
  const entries = (map: Map<string, number>) => Object.fromEntries(map);

  it("targets a block by its halves, never a row inside another sibling's subtree", () => {
    // Over a21, which belongs to a2's block (80-160): its lower half.
    expect(dropTargetAt(nested, 150)).toEqual({ id: "a2", position: "after" });
    // Over a1, inside a's block (0-200): its upper half.
    expect(dropTargetAt(top, 50)).toEqual({ id: "a", position: "before" });
  });

  it("steps the keyboard among siblings only", () => {
    const ids = nested.map((block) => block.id);
    expect(stepTarget(ids, "a1", null, 1)).toEqual({ id: "a2", position: "after" });
    expect(stepTarget(ids, "a1", { id: "a2", position: "after" }, 1)).toEqual({ id: "a3", position: "after" });
    expect(stepTarget(ids, "a1", { id: "a3", position: "after" }, 1)).toEqual({ id: "a3", position: "after" });
  });

  it("moves a whole block down: its rows travel together, the passed block slides up by its height", () => {
    const offsets = blockRowOffsets(top, rowOffsets(top, "a", { id: "b", position: "after" }));
    expect(entries(offsets)).toEqual({ a: 40, a1: 40, a2: 40, a21: 40, a3: 40, b: -200 });
  });

  it("moves a block up: every row of each block it passes slides down by its height", () => {
    const offsets = blockRowOffsets(top, rowOffsets(top, "c", { id: "a", position: "before" }));
    expect(entries(offsets)).toEqual({ c: -240, c1: -240, a: 80, a1: 80, a2: 80, a21: 80, a3: 80, b: 80 });
  });

  it("moves a nested row past a sibling with children", () => {
    const offsets = blockRowOffsets(nested, rowOffsets(nested, "a1", { id: "a2", position: "after" }));
    expect(entries(offsets)).toEqual({ a1: 80, a2: -40, a21: -40 });
  });

  it("counts the landing place among siblings", () =>
    expect(landingIndex(nested.map((block) => block.id), "a3", { id: "a1", position: "before" })).toBe(0));

  it("leaves a flat table's offsets as they were", () => {
    const flat = rects.map((rect) => ({ id: rect.id, parentId: null, depth: 0 }));
    const blocks = siblingBlocks(flat, rects, "a");
    const target = { id: "c", position: "after" } as const;
    expect(entries(blockRowOffsets(blocks, rowOffsets(blocks, "a", target)))).toEqual(
      entries(rowOffsets(rects, "a", target)),
    );
  });
});
