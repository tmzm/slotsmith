import { describe, expect, it } from "vitest";
import { placeLabels, type Box, type LabelPlacement, type LabelRequest } from "@/lib/label-placement";

const bounds: Box = { left: 0, top: 0, right: 400, bottom: 300 };
const label = (id: string, anchors: Box[], side: "above" | "below" = "above"): LabelRequest => ({ id, width: 60, height: 20, anchors, side });
const boxOf = (placement: LabelPlacement): Box => ({ left: placement.left, top: placement.top, right: placement.left + 60, bottom: placement.top + 20 });
const overlap = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe("placeLabels", () => {
  const row: Box = { left: 40, top: 100, right: 360, bottom: 130 };

  it("puts a label on its preferred side, at the start of its part, on the shortest leader", () => {
    const { a } = placeLabels([label("a", [row])], [], bounds);
    expect(a).toMatchObject({ side: "above", leaderLength: 8, anchor: 0 });
    expect(a!.top + 20 + 8).toBe(row.top);
    // The leader attaches just inside the part's left edge and inside the label.
    expect(a!.left + a!.leaderX).toBe(row.left + 10);
    expect(a!.leaderX).toBeGreaterThan(0);
    expect(a!.leaderX).toBeLessThan(60);
  });

  it("starts from the right edge on right-to-left pages", () => {
    const { a } = placeLabels([label("a", [row])], [], bounds, { rtl: true });
    expect(a!.left + a!.leaderX).toBe(row.right - 10);
    expect(a!.left + 60).toBeLessThanOrEqual(row.right);
  });

  it("never covers text: it moves along the part, then to a longer leader, then to the other side", () => {
    const text: Box = { left: 40, top: 60, right: 200, bottom: 98 };
    const { a } = placeLabels([label("a", [row])], [text], bounds);
    expect(overlap(boxOf(a!), text)).toBe(false);
    expect(a!.side).toBe("above");
    expect(a!.left).toBeGreaterThanOrEqual(200);

    // Text across the whole width above the part: only below is free.
    const band: Box = { left: 0, top: 0, right: 400, bottom: 98 };
    const below = placeLabels([label("a", [row])], [band], bounds).a!;
    expect(below.side).toBe("below");
    expect(below.top).toBe(row.bottom + 8);
  });

  it("keeps a leader from crossing text", () => {
    // A thin line of text between the part and the nearest free spot above its start.
    const text: Box = { left: 30, top: 84, right: 70, bottom: 96 };
    const { a } = placeLabels([label("a", [row])], [text], bounds);
    const x = a!.left + a!.leaderX;
    expect(x < text.left - 1 || x > text.right + 1).toBe(true);
  });

  it("labels a part that is itself an obstacle, such as an icon or a checkbox", () => {
    const icon: Box = { left: 200, top: 100, right: 214, bottom: 114 };
    const { a } = placeLabels([label("a", [icon])], [icon], bounds);
    expect(a).toMatchObject({ side: "above", leaderLength: 8 });
    expect(overlap(boxOf(a!), icon)).toBe(false);
  });

  it("keeps labels off each other, placing them in order", () => {
    const placements = placeLabels([label("a", [row]), label("b", [row]), label("c", [row])], [], bounds);
    const boxes = Object.values(placements).map((placement) => boxOf(placement!));
    expect(boxes).toHaveLength(3);
    for (const [index, box] of boxes.entries()) for (const other of boxes.slice(index + 1)) expect(overlap(box, other)).toBe(false);
    expect(placements.a!.left + placements.a!.leaderX).toBe(row.left + 10);
  });

  it("stays inside the bounds", () => {
    const top: Box = { left: 0, top: 10, right: 400, bottom: 40 };
    const { a } = placeLabels([label("a", [top])], [], bounds);
    // No room for the label above a part 10px from the top edge.
    expect(a!.side).toBe("below");
    const corner: Box = { left: 380, top: 100, right: 394, bottom: 114 };
    const { b } = placeLabels([label("b", [corner])], [], bounds);
    expect(b!.left + 60).toBeLessThanOrEqual(bounds.right);
  });

  it("falls back to the next anchor when the first has no free place", () => {
    const wall: Box = { left: 0, top: 0, right: 400, bottom: 200 };
    const free: Box = { left: 40, top: 240, right: 360, bottom: 250 };
    const { a } = placeLabels([label("a", [row, free])], [wall], bounds);
    expect(a!.anchor).toBe(1);
  });

  it("leaves out a label that fits nowhere, and one with no size", () => {
    const wall: Box = { left: 0, top: 0, right: 400, bottom: 300 };
    expect(placeLabels([label("a", [row])], [wall], bounds).a).toBeUndefined();
    expect(placeLabels([{ ...label("a", [row]), width: 0 }], [], bounds).a).toBeUndefined();
    expect(placeLabels([label("a", [])], [], bounds).a).toBeUndefined();
  });
});
