import { describe, expect, it } from "vitest";
import { defaultLabels } from "../../data-table/slots/fallbacks";
import { defineLocale } from "../defineLocale";

describe("defineLocale", () => {
  it("infers the direction from the code", () => {
    expect(defineLocale({ code: "ckb" }).dir).toBe("rtl");
    expect(defineLocale({ code: "nl" }).dir).toBe("ltr");
  });
  it("keeps an explicit direction", () => {
    expect(defineLocale({ code: "ku", dir: "rtl" }).dir).toBe("rtl");
  });
  it("keeps the sections it was given", () => {
    const table = { ...defaultLabels, empty: "Niets" };
    expect(defineLocale({ code: "nl", table }).table).toBe(table);
  });
  it("rejects a section with a missing key at compile time", () => {
    const { empty: _empty, ...incomplete } = defaultLabels;
    // @ts-expect-error a section that is present must be complete
    defineLocale({ code: "nl", table: incomplete });
  });
});
