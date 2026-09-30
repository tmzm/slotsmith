import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
// jsdom ships no types; the repo root has it as a dev dependency.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import Demo from "@/components/Demo.astro";
import Parts from "@/components/landing/Parts.astro";
import Cards from "@/components/landing/Cards.astro";

let container: AstroContainer;

beforeAll(async () => {
  const renderers = await loadRenderers([getContainerRenderer()]);
  container = await AstroContainer.create({ renderers });
});

function parse(html: string): Document {
  return new JSDOM(html).window.document as Document;
}

const normalise = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

describe("Demo showCode", () => {
  it("renders the live demo alone and still names its sample", async () => {
    const html = await container.renderToString(Demo, {
      props: { name: "landing/card-file-uploader", lang: "en", height: "10rem", showCode: false },
    });
    const doc = parse(html);
    expect(doc.querySelector("figure")?.getAttribute("data-sample")).toBe("landing/card-file-uploader");
    expect(doc.querySelector('[role="tablist"]')).toBeNull();
    expect(doc.querySelector(".sample-code")).toBeNull();
    expect(doc.querySelector(".sfu")).not.toBeNull();
  });

  it("keeps the code tabs by default", async () => {
    const doc = parse(await container.renderToString(Demo, { props: { name: "landing/card-file-uploader", lang: "en", height: "10rem" } }));
    expect(doc.querySelectorAll('[role="tab"]').length).toBeGreaterThanOrEqual(2);
  });
});

describe("Parts", () => {
  async function render(lang: "en" | "ar") {
    return parse(await container.renderToString(Parts, { props: { lang } }));
  }

  it("is headed 'Two kinds of parts' and shows one sample for each kind, without a live demo", async () => {
    const doc = await render("en");
    expect(normalise(doc.querySelector("h2")?.textContent)).toBe("Two kinds of parts");
    const samples = [...doc.querySelectorAll("[data-sample]")].map((el) => el.getAttribute("data-sample"));
    expect(samples).toEqual(["landing/element-part", "landing/widget-part"]);
    expect(doc.querySelector("astro-island")).toBeNull();
  });

  it("frames the columns with decorative bracket glyphs", async () => {
    const doc = await render("en");
    const glyphs = [...doc.querySelectorAll("[data-glyph]")];
    expect(glyphs.map((glyph) => glyph.getAttribute("data-glyph"))).toEqual(["<", ">", "{", "}"]);
    for (const glyph of glyphs) expect(glyph.getAttribute("aria-hidden")).toBe("true");
  });

  it("labels the parts with the kind from the reference", async () => {
    const doc = await render("en");
    const element = [...doc.querySelectorAll(".part-label--element")].map((el) => el.textContent);
    const widget = [...doc.querySelectorAll(".part-label--widget")].map((el) => el.textContent);
    expect(element).toContain("<Row>");
    expect(widget).toContain("{Checkbox}");
    expect(element.every((label) => /^<\w+>$/.test(label ?? ""))).toBe(true);
    expect(widget.every((label) => /^\{\w+\}$/.test(label ?? ""))).toBe(true);
  });

  it("has the kind / receives / drop-in table with two rows", async () => {
    const doc = await render("en");
    const headers = [...doc.querySelectorAll("table thead th")].map((th) => normalise(th.textContent));
    expect(headers).toEqual(["Kind", "Receives", "Drop-in for"]);
    expect(doc.querySelectorAll("table tbody tr")).toHaveLength(2);
  });

  it("links to the guides in the page's language", async () => {
    expect((await render("en")).querySelector('a[href="/guides/"]')).not.toBeNull();
    const ar = await render("ar");
    expect(ar.querySelector('a[href="/ar/guides/"]')).not.toBeNull();
    expect(normalise(ar.querySelector("h2")?.textContent)).toMatch(/[؀-ۿ]/);
  });
});

describe("Cards", () => {
  async function render(lang: "en" | "ar") {
    return parse(await container.renderToString(Cards, { props: { lang } }));
  }

  it("is headed 'Four components' with one panel per component, each linking to its page", async () => {
    const doc = await render("en");
    expect(normalise(doc.querySelector("h2")?.textContent)).toBe("Four components");
    const panels = [...doc.querySelectorAll("[data-panel]")];
    expect(panels).toHaveLength(4);
    const links = panels.map((panel) => panel.querySelector("h3 a")?.getAttribute("href"));
    // Reading order, which is the mosaic's visual order: table, combobox, uploader, date picker.
    expect(links).toEqual(["/components/data-table/", "/components/autocomplete/", "/components/file-uploader/", "/components/date-picker/"]);
  });

  it("gives each panel its live card demo, fallback, with no code shown and a reserved height", async () => {
    const doc = await render("en");
    const figures = [...doc.querySelectorAll("[data-panel] figure[data-sample]")];
    expect(figures.map((figure) => figure.getAttribute("data-sample"))).toEqual([
      "landing/card-data-table",
      "landing/card-autocomplete",
      "landing/card-file-uploader",
      "landing/card-date-picker",
    ]);
    for (const figure of figures) {
      expect(figure.hasAttribute("data-fallback")).toBe(true);
      expect(figure.querySelector('[role="tablist"]')).toBeNull();
      expect(figure.getAttribute("style")).toMatch(/--demo-h:\s*\S+/);
    }
  });

  it("shows each component's summary", async () => {
    const doc = await render("en");
    expect(normalise(doc.querySelector('[data-panel="data-table"]')?.textContent)).toContain("A table with sorting, selection");
  });

  it("renders Arabic names and links on Arabic pages", async () => {
    const doc = await render("ar");
    expect(doc.querySelector('[data-panel] h3 a[href="/ar/components/data-table/"]')).not.toBeNull();
    expect(normalise(doc.querySelector("h2")?.textContent)).toMatch(/[؀-ۿ]/);
  });
});
