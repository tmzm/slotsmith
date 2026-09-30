import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
// jsdom ships no types; the repo root has it as a dev dependency.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import Tabs from "@/components/Tabs.astro";
import Hero from "@/components/landing/Hero.astro";

const POSITIONING_FIRST =
  "Finished data table, combobox, date picker and file uploader for React that drop into shadcn/ui, MUI, Chakra or your own design system.";
const POSITIONING_SECOND = "Every part is a slot; what you don't replace still looks finished.";

const INSTALL_TABS = [
  { label: "npm", sample: "install/npm" },
  { label: "pnpm", sample: "install/pnpm" },
  { label: "yarn", sample: "install/yarn" },
  { label: "bun", sample: "install/bun" },
];

let container: AstroContainer;

beforeAll(async () => {
  const renderers = await loadRenderers([getContainerRenderer()]);
  container = await AstroContainer.create({ renderers });
});

function parse(html: string): Document {
  return new JSDOM(html).window.document as Document;
}

const normalise = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

describe("Tabs", () => {
  async function render() {
    return parse(await container.renderToString(Tabs, { props: { id: "install", tabs: INSTALL_TABS, remember: "pm" } }));
  }

  it("renders one tablist whose tabs each control a panel", async () => {
    const doc = await render();
    expect(doc.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    const tabs = [...doc.querySelectorAll('[role="tab"]')];
    expect(tabs).toHaveLength(4);
    for (const tab of tabs) {
      const panel = doc.getElementById(tab.getAttribute("aria-controls") ?? "");
      expect(panel?.getAttribute("role")).toBe("tabpanel");
      expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
    }
  });

  it("selects the first tab and leaves the others out of the tab order", async () => {
    const doc = await render();
    const tabs = [...doc.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"]);
    expect(tabs.map((tab) => tab.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
  });

  it("puts each install command in its panel", async () => {
    const doc = await render();
    const panels = [...doc.querySelectorAll('[role="tabpanel"]')].map((panel) => normalise(panel.textContent));
    expect(panels).toHaveLength(4);
    expect(panels[0]).toContain("npm i slotsmith");
    expect(panels[1]).toContain("pnpm add slotsmith");
    expect(panels[2]).toContain("yarn add slotsmith");
    expect(panels[3]).toContain("bun add slotsmith");
  });

  it("names the storage key it remembers the choice under", async () => {
    const doc = await render();
    expect(doc.querySelector("[data-tabs]")?.getAttribute("data-remember")).toBe("pm");
  });
});

describe("Hero", () => {
  async function render(lang: "en" | "ar") {
    return parse(await container.renderToString(Hero, { props: { lang } }));
  }

  it("holds the first positioning sentence as the only h1", async () => {
    const doc = await render("en");
    const headings = doc.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(normalise(headings[0]?.textContent)).toBe(POSITIONING_FIRST);
  });

  it("sets the four component names as display spans inside the h1", async () => {
    const doc = await render("en");
    const names = [...doc.querySelectorAll("h1 .display")].map((span) => normalise(span.textContent));
    expect(names).toEqual(["data table", "combobox", "date picker", "file uploader"]);
  });

  it("follows the h1 with the second sentence as the lede", async () => {
    const doc = await render("en");
    const next = doc.querySelector("h1")?.nextElementSibling;
    expect(next?.tagName).toBe("P");
    expect(normalise(next?.textContent)).toBe(POSITIONING_SECOND);
  });

  it("links to getting started and the repository, in the page's language", async () => {
    const en = await render("en");
    const ar = await render("ar");
    const hrefs = (doc: Document) => [...doc.querySelectorAll(".hero__links a")].map((a) => a.getAttribute("href"));
    expect(hrefs(en)).toEqual(["/getting-started/", "https://github.com/tmzm/slotsmith"]);
    expect(hrefs(ar)).toEqual(["/ar/getting-started/", "https://github.com/tmzm/slotsmith"]);
  });

  it("marks Latin names in the Arabic heading as English", async () => {
    const doc = await render("ar");
    const latin = [...doc.querySelectorAll('h1 [lang="en"]')].map((span) => span.textContent);
    expect(latin).toEqual(expect.arrayContaining(["React", "shadcn/ui", "MUI", "Chakra"]));
    expect(doc.querySelectorAll("h1 .display")).toHaveLength(4);
  });

  it("marks its panels for the first-load wave", async () => {
    const doc = await render("en");
    expect(doc.querySelectorAll("[data-panel]").length).toBeGreaterThanOrEqual(2);
  });
});
