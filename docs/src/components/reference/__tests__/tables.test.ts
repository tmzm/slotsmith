import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types (it is a dev dependency of the docs).
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import SlotTable from "@/components/reference/SlotTable.astro";
import PropTable from "@/components/reference/PropTable.astro";
import LabelTable from "@/components/reference/LabelTable.astro";
import StylingTable from "@/components/reference/StylingTable.astro";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const normalise = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

async function render(component: Parameters<AstroContainer["renderToString"]>[0], props: Record<string, unknown>): Promise<Document> {
  return new JSDOM(await container.renderToString(component, { props })).window.document as Document;
}

/** Every table sits in a focusable, named, scrollable region (axe's scrollable-region-focusable). */
function expectRegion(doc: Document) {
  const region = doc.querySelector(".ref-table");
  expect(region?.getAttribute("role")).toBe("region");
  expect(region?.getAttribute("tabindex")).toBe("0");
  expect(region?.getAttribute("aria-label")).toBeTruthy();
  expect(region?.querySelector("table")).not.toBeNull();
}

describe("SlotTable", () => {
  it("renders one row per slot, each with an anchor id", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    expectRegion(doc);
    expect(doc.querySelectorAll("tbody tr")).toHaveLength(22);
    expect(doc.querySelector("tr#slot-FooterRow")).not.toBeNull();
  });

  it("has the columns in order", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    expect([...doc.querySelectorAll("thead th")].map((th) => normalise(th.textContent))).toEqual([
      "Name",
      "Kind",
      "Props it receives",
      "Default fallback",
      "data-* attributes",
    ]);
  });

  it("lists the Row slot's data attributes", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    const cells = doc.querySelectorAll("tr#slot-Row td");
    const attributes = normalise(cells[cells.length - 1]?.textContent);
    for (const name of ["data-state", "data-row-id", "data-depth", "data-expanded", "data-clickable"]) expect(attributes).toContain(name);
  });

  it("shows a dash for a slot with no data attributes", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    const cells = doc.querySelectorAll("tr#slot-Pagination td");
    expect(normalise(cells[cells.length - 1]?.textContent)).toBe("—");
  });

  it("marks the kind with the landing's brackets", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    expect(normalise(doc.querySelector("tr#slot-Row .ref-kind")?.textContent)).toBe("<element>");
    expect(normalise(doc.querySelector("tr#slot-Pagination .ref-kind")?.textContent)).toBe("{widget}");
  });

  it("collapses the fallback source and keeps code left to right", async () => {
    const doc = await render(SlotTable, { slug: "data-table" });
    const details = doc.querySelector("tr#slot-Pagination details");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(normalise(details?.querySelector("summary")?.textContent)).toBe("Fallback source");
    expect(details?.querySelector("pre")?.getAttribute("dir")).toBe("ltr");
    for (const code of doc.querySelectorAll("td code:not(pre code)")) expect(code.getAttribute("dir")).toBe("ltr");
  });

  it("translates its headings on Arabic pages", async () => {
    const doc = await render(SlotTable, { slug: "data-table", lang: "ar" });
    expect(normalise(doc.querySelector("thead th")?.textContent)).not.toBe("Name");
    expect(doc.querySelector("tr#slot-Row code")?.getAttribute("dir")).toBe("ltr");
  });
});

describe("PropTable", () => {
  it("groups the props under the reference's group headings", async () => {
    const doc = await render(PropTable, { slug: "data-table" });
    expectRegion(doc);
    const headings = [...doc.querySelectorAll("tbody th[scope=colgroup]")].map((th) => normalise(th.textContent));
    expect(headings).toContain("Row reordering");
    expect(headings[0]).toBe("Data");
  });

  it("marks required props and shows defaults or a dash", async () => {
    const doc = await render(PropTable, { slug: "data-table" });
    expect(normalise(doc.querySelector("tr#prop-data")?.textContent)).toContain("required");
    expect(normalise(doc.querySelector("tr#prop-sorting")?.textContent)).not.toContain("required");
    expect(normalise(doc.querySelector("tr#prop-manualSorting td:nth-child(3)")?.textContent)).toBe("false");
    expect(normalise(doc.querySelector("tr#prop-sorting td:nth-child(3)")?.textContent)).toBe("—");
  });

  it("names the root element that takes the remaining DOM props", async () => {
    const doc = await render(PropTable, { slug: "data-table" });
    expect(normalise(doc.querySelector(".ref-root-note")?.textContent)).toContain("<div>");
  });
});

describe("LabelTable", () => {
  it("shows each label's English default", async () => {
    const doc = await render(LabelTable, { slug: "data-table" });
    expectRegion(doc);
    expect(normalise(doc.querySelector("tr#label-retry")?.textContent)).toContain('"Retry"');
  });

  it("shows a function label's signature and an example output, never [Function]", async () => {
    const doc = await render(LabelTable, { slug: "data-table" });
    const row = normalise(doc.querySelector("tr#label-pageInfo")?.textContent);
    expect(row).toContain("(page: number, pageCount: number) => ReactNode");
    expect(row).toContain("pageInfo(3, 12)");
    expect(row).toContain('"Page 3 of 12"');
    expect(doc.body.textContent).not.toContain("[Function");
  });

  it("fills defaults the generator missed from the library's labels", async () => {
    const doc = await render(LabelTable, { slug: "data-table" });
    expect(normalise(doc.querySelector("tr#label-reorderCancelled")?.textContent)).toContain('"Reordering cancelled."');
    expect(normalise(doc.querySelector("tr#label-reorderLifted")?.textContent)).toContain('"Row lifted. Position 3 of 12."');
  });
});

describe("StylingTable", () => {
  it("lists class names, tokens and the dark-mode selector", async () => {
    const doc = await render(StylingTable, { slug: "data-table" });
    const text = normalise(doc.body.textContent);
    expect(text).toContain("sdt__row");
    expect(text).toContain("--sdt-accent");
    expect(text).toContain("--ss-text");
    expect(text).toContain('.dark, [data-theme="dark"]');
    expect(doc.querySelectorAll(".ref-table").length).toBe(2);
  });
});
