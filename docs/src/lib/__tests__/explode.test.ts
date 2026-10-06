import { describe, expect, it } from "vitest";
import { bracketLabel, explodeParts, slotKinds } from "@/lib/explode";
import { getReference } from "@/lib/reference";
import { SLOT_SELECTORS } from "../../../scripts/slot-selectors.ts";

const reference = getReference("data-table");
const selectors = SLOT_SELECTORS["data-table"];

describe("explodeParts", () => {
  it("takes each part's kind from the reference and its selector from SLOT_SELECTORS", () => {
    const parts = explodeParts(reference, selectors, ["Row", "Checkbox"]);
    expect(parts.map(({ slot, kind, selector }) => ({ slot, kind, selector }))).toEqual([
      { slot: "Row", kind: "element", selector: selectors.Row },
      { slot: "Checkbox", kind: "widget", selector: selectors.Checkbox },
    ]);
  });

  it("gives every landing part an offset", () => {
    const picks = ["HeaderRow", "HeaderCell", "SortIcon", "Row", "Cell", "Checkbox", "Pagination", "PageSizeSelect"];
    const parts = explodeParts(reference, selectors, picks);
    expect(parts.map((part) => part.slot)).toEqual(picks);
    for (const part of parts) expect(Math.abs(part.dx) + Math.abs(part.dy), part.slot).toBeGreaterThan(0);
    // The checkbox column slides toward the start side, pagination drops below.
    expect(parts.find((part) => part.slot === "Checkbox")!.dx).toBeLessThan(0);
    expect(parts.find((part) => part.slot === "Pagination")!.dy).toBeGreaterThan(0);
  });

  it("says where each part's label looks for room first", () => {
    const parts = explodeParts(reference, selectors, ["HeaderCell", "Row", "Cell", "Checkbox", "Empty"]);
    const hint = (slot: string) => parts.find((part) => part.slot === slot)!.label;
    // The header's parts hang their labels under the header, the body's stand on the first row.
    expect(hint("HeaderCell")).toEqual({ anchor: "middle", side: "below" });
    expect(hint("Row")).toEqual({ anchor: "first", side: "above" });
    expect(hint("Cell")).toEqual({ anchor: "row-end", side: "above" });
    expect(hint("Checkbox")).toEqual({ anchor: "first", side: "below" });
    // A part without a hint of its own.
    expect(hint("Empty")).toEqual({ anchor: "middle", side: "above" });
  });

  it("throws on a slot the reference does not have", () => {
    expect(() => explodeParts(reference, selectors, ["Row", "Rowz"])).toThrow(/"Rowz"/);
  });

  it("throws on a slot with no selector", () => {
    expect(() => explodeParts(reference, {}, ["Row"])).toThrow(/"Row"/);
  });
});

describe("bracketLabel", () => {
  it("frames element parts in angle brackets and widget parts in braces", () => {
    expect(bracketLabel({ slot: "Row", kind: "element" })).toBe("<Row>");
    expect(bracketLabel({ slot: "Checkbox", kind: "widget" })).toBe("{Checkbox}");
  });
});

describe("slotKinds", () => {
  it("names each slot with its kind from the reference", () => {
    expect(slotKinds(reference, ["Row", "Checkbox"])).toEqual([
      { slot: "Row", kind: "element" },
      { slot: "Checkbox", kind: "widget" },
    ]);
  });

  it("throws on a slot the reference does not have", () => {
    expect(() => slotKinds(reference, ["Rowz"])).toThrow(/"Rowz"/);
  });
});
