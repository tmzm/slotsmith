import { describe, expect, it } from "vitest";
import { demoId, nextTabIndex } from "@/lib/demo";

describe("nextTabIndex", () => {
  it("moves with the arrow that points the way in left-to-right text", () => {
    expect(nextTabIndex(0, 3, "ArrowRight", "ltr")).toBe(1);
    expect(nextTabIndex(1, 3, "ArrowLeft", "ltr")).toBe(0);
  });

  it("mirrors the arrows in right-to-left text", () => {
    expect(nextTabIndex(0, 3, "ArrowLeft", "rtl")).toBe(1);
    expect(nextTabIndex(1, 3, "ArrowRight", "rtl")).toBe(0);
  });

  it("wraps around at both ends", () => {
    expect(nextTabIndex(2, 3, "ArrowRight", "ltr")).toBe(0);
    expect(nextTabIndex(0, 3, "ArrowLeft", "ltr")).toBe(2);
  });

  it("jumps to the first and last tab with Home and End", () => {
    expect(nextTabIndex(1, 3, "Home", "rtl")).toBe(0);
    expect(nextTabIndex(1, 3, "End", "ltr")).toBe(2);
  });

  it("ignores other keys", () => {
    expect(nextTabIndex(1, 3, "Enter", "ltr")).toBeUndefined();
  });
});

describe("demoId", () => {
  it("gives two demos of the same sample on one page different ids", () => {
    const page = new Request("https://example.test/");
    const first = demoId(page, "data-table/quick-start");
    const second = demoId(page, "data-table/quick-start");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^demo-data-table-quick-start-\d+$/);
  });

  it("starts again on every page, so builds are stable", () => {
    expect(demoId(new Request("https://example.test/a/"), "smoke/x")).toBe(demoId(new Request("https://example.test/b/"), "smoke/x"));
  });
});
