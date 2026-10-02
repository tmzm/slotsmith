import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
// jsdom ships no types; the repo root has it as a dev dependency.
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import InstallBlock from "@/components/reference/InstallBlock.astro";

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const normalise = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

async function render(slug: string, lang: "en" | "ar" = "en") {
  const html = await container.renderToString(InstallBlock, { props: { slug, lang } });
  return { html, doc: new JSDOM(html).window.document as Document };
}

describe("InstallBlock", () => {
  it("installs the data table with its TanStack peer and imports its stylesheet", async () => {
    const { doc } = await render("data-table");
    const text = normalise(doc.body.textContent);
    expect(text).toContain("npm i slotsmith @tanstack/react-table");
    expect(text).toContain("pnpm add slotsmith @tanstack/react-table");
    expect(text).toContain('import "slotsmith/data-table.css"');
    expect(text).toContain("slotsmith/styles.css");
  });

  it("remembers the package manager across pages", async () => {
    const { doc } = await render("data-table");
    expect(doc.querySelector("[data-tabs]")?.getAttribute("data-remember")).toBe("pm");
    expect([...doc.querySelectorAll('[role="tab"]')].map((tab) => normalise(tab.textContent))).toEqual(["npm", "pnpm", "yarn", "bun"]);
  });

  it("installs the autocomplete alone and names the optional virtual peer", async () => {
    const { doc } = await render("autocomplete");
    const commands = [...doc.querySelectorAll('[role="tabpanel"] pre')].map((pre) => normalise(pre.textContent));
    expect(commands[0]).toBe("npm i slotsmith");
    expect(normalise(doc.body.textContent)).not.toContain("@tanstack/react-table");
    const optional = normalise(doc.querySelector(".install-optional")?.textContent);
    expect(optional).toContain("VirtualAutocomplete");
    expect(optional).toContain("@tanstack/react-virtual");
  });

  it("omits the optional line when a component has no optional peers", async () => {
    const { doc } = await render("date-picker");
    expect(doc.querySelector(".install-optional")).toBeNull();
  });

  it("keeps commands left to right on Arabic pages", async () => {
    const { doc } = await render("data-table", "ar");
    for (const pre of doc.querySelectorAll("pre")) expect(pre.getAttribute("dir")).toBe("ltr");
  });
});
