import { describe, expect, it } from "vitest";
import {
  blockRowOffsets,
  canReorder,
  depthRange,
  groupOrder,
  layoutOffsets,
  moveInTree,
  placementAt,
  type TreeNode,
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
  const on = { enabled: true, rowCount: 5 };
  it("is on for a table with rows, flat or tree", () => expect(canReorder(on)).toBe(true));
  it("is off when not enabled", () => expect(canReorder({ ...on, enabled: false })).toBe(false));
  it("is off while sorted only when asked to block", () => {
    expect(canReorder({ ...on, sorted: true })).toBe(true);
    expect(canReorder({ ...on, sorted: true, whileSorted: "clearSort" })).toBe(true);
    expect(canReorder({ ...on, sorted: true, whileSorted: "block" })).toBe(false);
  });
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

describe("moving across parents", () => {
  // a                 depth 0
  //   a1              depth 1
  //   a2              depth 1
  // b                 depth 0 (collapsed, with b1 hidden)
  // c                 depth 0
  const rows = [
    { id: "a", parentId: null, depth: 0 },
    { id: "a1", parentId: "a", depth: 1 },
    { id: "a2", parentId: "a", depth: 1 },
    { id: "b", parentId: null, depth: 0 },
    { id: "c", parentId: null, depth: 0 },
  ];
  const children: Record<string, string[]> = { root: ["a", "b", "c"], a: ["a1", "a2"], b: ["b1"] };
  const childrenOf = (parentId: string | null) => children[parentId ?? "root"] ?? [];

  it("allows depths from the row below to one under the row above", () => {
    expect(depthRange(rows[2], rows[3])).toEqual({ min: 0, max: 2 });
    expect(depthRange(rows[0], rows[1])).toEqual({ min: 1, max: 1 });
    expect(depthRange(undefined, rows[0])).toEqual({ min: 0, max: 0 });
    expect(depthRange(rows[4], undefined)).toEqual({ min: 0, max: 1 });
  });

  it("places a row as a sibling before the row below", () => {
    expect(placementAt(rows, 3, 0, childrenOf)).toEqual({ parentId: null, index: 1, depth: 0 });
  });

  it("places a row after the row above's ancestor at a shallower depth", () => {
    // Between a2 and b, at depth 1: after a2, inside a.
    expect(placementAt(rows, 3, 1, childrenOf)).toEqual({ parentId: "a", index: 2, depth: 1 });
  });

  it("places a row as the last child of a collapsed row above", () => {
    // Between b and c, one deeper than b: after b's hidden b1.
    expect(placementAt(rows, 4, 1, childrenOf)).toEqual({ parentId: "b", index: 1, depth: 1 });
  });

  it("places a row as the first shown child of an expanded row above", () => {
    expect(placementAt(rows, 1, 1, childrenOf)).toEqual({ parentId: "a", index: 0, depth: 1 });
  });

  it("rebuilds only the rows on the way, with setSubRows", () => {
    type Node = { id: string; kids?: Node[] };
    const tree: Node[] = [
      { id: "a", kids: [{ id: "a1" }, { id: "a2" }] },
      { id: "b", kids: [{ id: "b1" }] },
      { id: "c" },
    ];
    const toNodes = (nodes: Node[], parent?: string): TreeNode<Node>[] =>
      nodes.map((node) => ({ id: node.id, original: node, subRows: node.kids ? toNodes(node.kids, node.id) : undefined }));
    const setSubRows = (row: Node, subRows: Node[]) => ({ ...row, kids: subRows });

    const next = moveInTree(toNodes(tree), "a2", { parentId: "c", index: 0 }, setSubRows);
    expect(next.map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(next[0]!.kids!.map((node) => node.id)).toEqual(["a1"]);
    expect(next[1]).toBe(tree[1]);
    expect(next[2]!.kids!.map((node) => node.id)).toEqual(["a2"]);
    expect(next[2]!.kids![0]).toBe(tree[0]!.kids![1]);

    const outdented = moveInTree(toNodes(tree), "a1", { parentId: null, index: 1 }, setSubRows);
    expect(outdented.map((node) => node.id)).toEqual(["a", "a1", "b", "c"]);
  });
});

describe("moving a group", () => {
  const blocks = ["a", "b", "c", "d", "e"].map((id, index) => ({ id, top: index * 10, bottom: index * 10 + 10, ids: [id] }));

  it("puts a group back together at a gap, in its own order", () => {
    expect(groupOrder(["a", "b", "c", "d", "e"], ["d", "b"], 0)).toEqual(["b", "d", "a", "c", "e"]);
    expect(groupOrder(["a", "b", "c", "d", "e"], ["b", "d"], 3)).toEqual(["a", "c", "e", "b", "d"]);
  });

  it("draws each block where a new order puts it", () => {
    const offsets = layoutOffsets(blocks, ["b", "d", "a", "c", "e"]);
    expect(Object.fromEntries(offsets)).toEqual({ b: -10, d: -20, a: 20, c: 10 });
  });
});
