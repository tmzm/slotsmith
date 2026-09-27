import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultLabels } from "../../data-table/slots/fallbacks";
import { defineLocale } from "../defineLocale";
import { findPack, resetLocaleWarnings, resolveLocale, sectionOf } from "../resolve";

const ar = defineLocale({ code: "ar", table: (code) => ({ ...defaultLabels, empty: `فارغ ${code}` }) });
const arEG = defineLocale({ code: "ar-EG", table: { ...defaultLabels, empty: "مصر" } });
const fr = defineLocale({ code: "fr", table: { ...defaultLabels, empty: "Vide" } });

afterEach(() => {
  vi.restoreAllMocks();
  resetLocaleWarnings();
});

describe("findPack", () => {
  it("prefers the exact code, ignoring case", () => {
    expect(findPack("AR-eg", [ar, arEG])).toBe(arEG);
  });
  it("falls back to the pack of the bare language", () => {
    expect(findPack("ar-SA", [arEG, ar])).toBe(ar);
  });
  it("falls back to any pack of the same language", () => {
    expect(findPack("ar-SA", [fr, arEG])).toBe(arEG);
  });
  it("returns nothing when no pack shares the language", () => {
    expect(findPack("de", [ar, fr])).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("uses an object as it is", () => {
    expect(resolveLocale(fr, [])).toEqual({ code: "fr", dir: "ltr", pack: fr });
  });
  it("keeps the requested tag when a string resolves to a broader pack", () => {
    expect(resolveLocale("ar-EG", [ar])).toEqual({ code: "ar-EG", dir: "rtl", pack: ar });
  });
  it("returns no pack and warns once for an unregistered language", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveLocale("de", [ar])).toEqual({ code: "de", dir: "ltr", pack: undefined });
    resolveLocale("de", [ar]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('"de"');
  });
  it("never warns for English", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveLocale("en-GB", []);
    expect(warn).not.toHaveBeenCalled();
  });
  it("returns nothing for no input", () => {
    expect(resolveLocale(undefined, [ar])).toBeUndefined();
  });
});

describe("sectionOf", () => {
  it("calls a function section with the active tag", () => {
    expect(sectionOf(resolveLocale("ar-EG", [ar]), "table")!.empty).toBe("فارغ ar-EG");
  });
  it("returns the same object for the same pack and tag", () => {
    const resolved = resolveLocale("ar-EG", [ar]);
    expect(sectionOf(resolved, "table")).toBe(sectionOf(resolveLocale("ar-EG", [ar]), "table"));
  });
  it("returns nothing for a section the pack does not have", () => {
    expect(sectionOf(resolveLocale(fr, []), "datePicker")).toBeUndefined();
  });
  it("returns nothing when nothing resolved", () => {
    expect(sectionOf(undefined, "table")).toBeUndefined();
  });
});
