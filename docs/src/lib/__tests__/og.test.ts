import { describe, expect, it } from "vitest";
import { layoutTitle, OG_HEIGHT, OG_WIDTH, ogSlug, ogUrl, renderOg } from "@/lib/og";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/** Width and height from a PNG's IHDR chunk. */
function size(png: Uint8Array): [number, number] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

describe("ogSlug", () => {
  it("names the landing image index", () => {
    expect(ogSlug("en", "/")).toBe("index");
    expect(ogSlug("ar", "/")).toBe("ar");
  });

  it("prefixes the language and drops the slashes", () => {
    expect(ogSlug("ar", "/theming/")).toBe("ar/theming");
    expect(ogSlug("en", "/components/data-table/guides/pagination/")).toBe("components/data-table/guides/pagination");
  });
});

describe("ogUrl", () => {
  it("is absolute, on the site's domain", () => {
    expect(ogUrl("en", "/")).toBe("https://slotsmith.dev/og/index.png");
    expect(ogUrl("ar", "/theming/")).toBe("https://slotsmith.dev/og/ar/theming.png");
  });
});

describe("layoutTitle", () => {
  it("sets a short title large and whole, in capitals", () => {
    expect(layoutTitle("Theming")).toEqual({ size: 184, text: "THEMING", truncated: false });
  });

  it("makes the type smaller for a longer title, without cutting it", () => {
    const title = "Loading, empty and error states for remote options ".repeat(3).slice(0, 120).trim();
    const layout = layoutTitle(title);
    expect(layout.size).toBeLessThan(184);
    expect(layout.text).toBe(title.toUpperCase());
    expect(layout.truncated).toBe(false);
  });

  it("cuts a title that does not fit at the smallest size and ends it with an ellipsis", () => {
    const title = "Loading, empty and error states for remote options ".repeat(12).trim();
    const layout = layoutTitle(title);
    expect(layout).toMatchObject({ size: 48, truncated: true });
    expect(layout.text.endsWith("…")).toBe(true);
    expect(title.toUpperCase().startsWith(layout.text.slice(0, -1))).toBe(true);
    expect(layout.text.length).toBeLessThan(title.length);
  });

  it("cuts one endless word by letters", () => {
    const layout = layoutTitle("x".repeat(600));
    expect(layout.truncated).toBe(true);
    expect(layout.text).toMatch(/^X+…$/);
  });

  it("cuts a long Arabic title by words", () => {
    const title = "منتقي التاريخ: يوم واحد ونطاق وتواريخ متعددة ".repeat(12).trim();
    const layout = layoutTitle(title);
    expect(layout).toMatchObject({ size: 42, truncated: true });
    expect(layout.text.endsWith("…")).toBe(true);
  });

  it("drops the brackets of a marked title", () => {
    expect(layoutTitle("Finished [data table] and [combobox]", true).text).toBe("FINISHED DATA TABLE AND COMBOBOX");
  });
});

describe("renderOg", () => {
  it("returns a 1200 by 630 PNG", async () => {
    const png = await renderOg({ title: "Theming", section: null, lang: "en" });
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
    expect(size(png)).toEqual([OG_WIDTH, OG_HEIGHT]);
  });

  it("renders a 120-character title", async () => {
    const title = "Loading, empty and error states for remote options ".repeat(3).slice(0, 120);
    expect(title).toHaveLength(120);
    const png = await renderOg({ title, section: "slotsmith/autocomplete", lang: "en" });
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });

  it("renders a long title with no spaces", async () => {
    const png = await renderOg({ title: "x".repeat(120), section: null, lang: "en" });
    expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });

  it("renders a marked title and one that is cut", async () => {
    for (const input of [
      { title: "Finished [data table], [combobox] and [file uploader] for React", section: null, lang: "en" as const, marked: true },
      { title: "[جدول بيانات] و[منتقي تاريخ] جاهزة لـ React، تندمج في أي نظام تصميم", section: null, lang: "ar" as const, marked: true },
      { title: "Sorting and selection ".repeat(40), section: "docs", lang: "en" as const },
    ]) {
      const png = await renderOg(input);
      expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
    }
  });

  it("renders Arabic, mixed and Latin titles on an Arabic page", async () => {
    for (const title of ["جدول البيانات: الفرز والتحديد", "واجهة البرمجة (API) لمكوّن React DataTable", "Theming"]) {
      const png = await renderOg({ title, section: "docs", lang: "ar" });
      expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
      expect(size(png)).toEqual([OG_WIDTH, OG_HEIGHT]);
    }
  });
});
