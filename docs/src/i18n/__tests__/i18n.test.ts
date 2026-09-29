import { describe, expect, it } from "vitest";
import { LANGS, dirOf, langFromParam, langPaths, localePath, stripLang, t } from "@/i18n";
import { en } from "../messages.en";
import { ar } from "../messages.ar";

describe("localePath", () => {
  it("prefixes Arabic paths", () => {
    expect(localePath("ar", "/")).toBe("/ar/");
    expect(localePath("ar", "/theming/")).toBe("/ar/theming/");
  });
  it("leaves English paths alone", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/components/data-table/")).toBe("/components/data-table/");
  });
});

describe("stripLang", () => {
  it("splits the language off a pathname", () => {
    expect(stripLang("/ar/")).toEqual({ lang: "ar", path: "/" });
    expect(stripLang("/ar/theming/")).toEqual({ lang: "ar", path: "/theming/" });
    expect(stripLang("/theming/")).toEqual({ lang: "en", path: "/theming/" });
    expect(stripLang("/ar")).toEqual({ lang: "ar", path: "/" });
  });
  it("does not mistake a path that merely starts with ar", () => {
    expect(stripLang("/arrays/")).toEqual({ lang: "en", path: "/arrays/" });
  });
});

describe("t", () => {
  it("returns English and Arabic strings", () => {
    expect(t("en", "nav.theming")).toBe("Theming");
    expect(t("ar", "nav.theming")).toBe(ar["nav.theming"]);
    expect(t("ar", "nav.theming")).not.toBe("Theming");
  });
  it("interpolates placeholders", () => {
    expect(t("en", "common.version", { version: "1.6" })).toContain("1.6");
    expect(t("en", "common.version", { version: "1.6" })).not.toContain("{version}");
  });
  it("has the same keys in both catalogs", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
});

describe("language helpers", () => {
  it("knows the languages and directions", () => {
    expect(LANGS).toEqual(["en", "ar"]);
    expect(dirOf("en")).toBe("ltr");
    expect(dirOf("ar")).toBe("rtl");
  });
  it("reads a route param", () => {
    expect(langFromParam(undefined)).toBe("en");
    expect(langFromParam("ar")).toBe("ar");
    expect(() => langFromParam("fr")).toThrow();
  });
  it("lists static paths for both languages", () => {
    expect(langPaths()).toEqual([{ params: { lang: undefined } }, { params: { lang: "ar" } }]);
  });
});
