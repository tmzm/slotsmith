import { describe, expect, it } from "vitest";
import { OG_HEIGHT, OG_WIDTH, ogSlug, ogUrl, renderOg } from "@/lib/og";

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

  it("renders Arabic, mixed and Latin titles on an Arabic page", async () => {
    for (const title of ["جدول البيانات: الفرز والتحديد", "واجهة البرمجة (API) لمكوّن React DataTable", "Theming"]) {
      const png = await renderOg({ title, section: "docs", lang: "ar" });
      expect([...png.slice(0, 4)]).toEqual(PNG_SIGNATURE);
      expect(size(png)).toEqual([OG_WIDTH, OG_HEIGHT]);
    }
  });
});
