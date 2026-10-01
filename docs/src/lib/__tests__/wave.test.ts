import { describe, expect, it } from "vitest";
import { waveOrder } from "@/lib/wave";

describe("waveOrder", () => {
  const sameRow = [
    { top: 100, left: 600, right: 900 },
    { top: 100, left: 40, right: 560 },
  ];

  it("starts at the left on left-to-right pages", () => {
    expect(waveOrder(sameRow, 1000, false)).toEqual([1, 0]);
  });

  it("starts at the right on right-to-left pages", () => {
    expect(waveOrder(sameRow, 1000, true)).toEqual([0, 1]);
  });

  it("weighs height 1.4 times width, so the wave runs diagonally", () => {
    // x + top * 1.4: 0 + 100 * 1.4 = 140 against 130 + 0 = 130.
    const rects = [
      { top: 100, left: 0, right: 200 },
      { top: 0, left: 130, right: 330 },
    ];
    expect(waveOrder(rects, 1000, false)).toEqual([1, 0]);
  });

  it("keeps the given order for ties and returns nothing for no rects", () => {
    const tie = [
      { top: 0, left: 10, right: 20 },
      { top: 0, left: 10, right: 20 },
    ];
    expect(waveOrder(tie, 100, false)).toEqual([0, 1]);
    expect(waveOrder([], 100, true)).toEqual([]);
  });
});
