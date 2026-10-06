import { beforeAll, describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getContainerRenderer } from "@astrojs/react/container-renderer";
// jsdom ships no types (it is a dev dependency of the docs).
// @ts-expect-error -- untyped module
import { JSDOM } from "jsdom";
import Demo from "@/components/Demo.astro";
import Parts from "@/components/landing/Parts.astro";
import Cards from "@/components/landing/Cards.astro";
import WorksWith from "@/components/landing/WorksWith.astro";
import Languages from "@/components/landing/Languages.astro";
import Agents from "@/components/landing/Agents.astro";
import TrustStrip from "@/components/landing/TrustStrip.astro";
import Close from "@/components/landing/Close.astro";
import MotionLoader from "@/components/landing/MotionLoader.astro";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE } from "../../../site.config.ts";

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

describe("WorksWith", () => {
  async function render(lang: "en" | "ar") {
    return parse(await container.renderToString(WorksWith, { props: { lang } }));
  }

  it("is headed 'Works with what you have' and links each logo to its page", async () => {
    const doc = await render("en");
    expect(normalise(doc.querySelector("h2")?.textContent)).toBe("Works with what you have");
    const links = [...doc.querySelectorAll(".marquee__list:not([aria-hidden]) a")].map((a) => [normalise(a.textContent), a.getAttribute("href")]);
    expect(links).toEqual([
      ["shadcn/ui", "/components/data-table/adapters/#shadcn"],
      ["MUI", "/components/data-table/adapters/#mui"],
      ["Chakra UI", "/components/data-table/adapters/#chakra"],
      ["Ant Design", "/components/data-table/adapters/#antd"],
      ["Tailwind CSS", "/theming/#tailwind"],
      ["TanStack Table", "/components/data-table/"],
      ["TanStack Query", "/components/data-table/guides/server-data/"],
    ]);
  });

  it("duplicates the list for the loop, hidden from assistive tech and out of the tab order", async () => {
    const doc = await render("en");
    const copy = doc.querySelector(".marquee__list[aria-hidden='true']");
    expect(copy).not.toBeNull();
    for (const link of copy!.querySelectorAll("a")) expect(link.getAttribute("tabindex")).toBe("-1");
  });

  it("shows each library's mark beside its name, the mark hidden and drawn in the text colour", async () => {
    const doc = await render("en");
    const items = [...doc.querySelectorAll(".marquee__list:not([aria-hidden]) .marquee__item")];
    expect(items.map((item) => normalise(item.querySelector(".marquee__name")?.textContent))).toEqual([
      "shadcn/ui",
      "MUI",
      "Chakra UI",
      "Ant Design",
      "Tailwind CSS",
      "TanStack Table",
      "TanStack Query",
    ]);
    for (const item of items) {
      const svg = item.querySelector(".marquee__logo > svg");
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      expect(svg?.getAttribute("fill")).toBe("currentColor");
      expect(svg?.querySelector("path")?.getAttribute("d")).toBeTruthy();
      expect(svg?.querySelector("title")).toBeNull();
    }
    expect(doc.querySelectorAll(".marquee img")).toHaveLength(0);
  });

  it("links in the page's language on Arabic pages", async () => {
    const doc = await render("ar");
    expect(doc.querySelector('a[href="/ar/theming/#tailwind"]')).not.toBeNull();
    expect(normalise(doc.querySelector("h2")?.textContent)).toMatch(/[؀-ۿ]/);
  });
});

describe("Languages", () => {
  it("shows the languages demo full width, with its code, and loads the Arabic font on demand", async () => {
    const html = await container.renderToString(Languages, { props: { lang: "en" } });
    const doc = parse(html);
    expect(normalise(doc.querySelector("h2")?.textContent)).toBe("Languages and right-to-left");
    expect(doc.querySelector("figure")?.getAttribute("data-sample")).toBe("landing/languages");
    expect(html).toMatch(/noto-sans-arabic[^"']*\.woff2/);
    expect(html).toContain("document.fonts");
  });
});

describe("Agents", () => {
  it("shows tabs for Claude Code, Cursor and VS Code, and links to the AI tools page", async () => {
    const doc = parse(await container.renderToString(Agents, { props: { lang: "en" } }));
    expect(normalise(doc.querySelector("h2")?.textContent)).toBe("Use with AI agents");
    expect([...doc.querySelectorAll('[role="tab"]')].map((tab) => normalise(tab.textContent))).toEqual(["Claude Code", "Cursor", "VS Code"]);
    expect([...doc.querySelectorAll("[data-sample]")].map((el) => el.getAttribute("data-sample"))).toEqual([
      "ai/claude-code",
      "ai/cursor",
      "ai/vscode",
    ]);
    expect(doc.querySelector('a[href="/ai-tools/"]')).not.toBeNull();
  });
});

describe("TrustStrip", () => {
  const facts = {
    version: "1.7.0",
    license: "ISC",
    react: ">=18",
    testFiles: 63,
    tests: 1311,
    integrationSuites: [{ component: "data-table", library: "mui" }],
    bundle: [{ entry: "slotsmith/data-table", minBytes: 60_000, gzipBytes: 18_841 }],
  };

  it("renders one manifest line, braces in gold, each pair a link to the trust page", async () => {
    const doc = parse(await container.renderToString(TrustStrip, { props: { lang: "ar", facts } }));
    const line = doc.querySelector(".manifest");
    expect(normalise(line?.textContent)).toBe('{ tests: 1311, suites: 1, gzip: "18.8 KB", license: "ISC", react: ">=18" }');
    expect(line?.getAttribute("dir")).toBe("ltr");
    const links = [...doc.querySelectorAll(".manifest a")];
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/ar/trust/#tests",
      "/ar/trust/#integrations",
      "/ar/trust/#sizes",
      "/ar/trust/#license",
      "/ar/trust/#support",
    ]);
    expect(doc.querySelectorAll(".manifest__brace")).toHaveLength(2);
  });
});

describe("Close", () => {
  it("shows the install command at display scale with a copy button and two links", async () => {
    const doc = parse(await container.renderToString(Close, { props: { lang: "en" } }));
    const section = doc.querySelector("section.close");
    expect(section?.getAttribute("aria-labelledby")).toBe("close-title");
    expect(normalise(doc.getElementById("close-title")?.textContent)).toBe("Install slotsmith");
    const command = doc.querySelector(".close__command");
    expect(normalise(command?.textContent)).toBe("npm i slotsmith");
    expect(command?.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    const copy = doc.querySelector("button[data-close-copy]");
    expect(normalise(copy?.textContent)).toBe("Copy");
    expect(copy?.getAttribute("data-label-copied")).toBe("Copied");
    const links = [...doc.querySelectorAll(".close__links a")].map((a) => [normalise(a.textContent), a.getAttribute("href")]);
    expect(links).toEqual([
      ["Get started", "/getting-started/"],
      ["GitHub", SITE.repo],
    ]);
  });

  it("links in the page's language on Arabic pages", async () => {
    const doc = parse(await container.renderToString(Close, { props: { lang: "ar" } }));
    expect(doc.querySelector('.close__links a[href="/ar/getting-started/"]')).not.toBeNull();
    expect(normalise(doc.querySelector(".close__command")?.textContent)).toBe("npm i slotsmith");
  });

  it("sets text on gold that passes 4.5:1 in both themes", () => {
    const tokens = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
    const values = (name: string) => [...tokens.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "gi"))].map((match) => match[1]!);
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((at) => {
        const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const gold = values("gold");
    const onGold = values("on-gold");
    expect(gold).toHaveLength(2);
    expect(onGold).toHaveLength(2);
    gold.forEach((background, theme) => {
      const [light, dark] = [luminance(background), luminance(onGold[theme]!)].sort((a, b) => b - a);
      expect((light! + 0.05) / (dark! + 0.05)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe("MotionLoader", () => {
  it("renders no markup of its own; its script waits for load and reduced motion before importing the motion module", async () => {
    const html = await container.renderToString(MotionLoader);
    expect(parse(html).body.textContent?.trim()).toBe("");
    const source = readFileSync(resolve(process.cwd(), "src/components/landing/MotionLoader.astro"), "utf8");
    expect(source).toMatch(/prefers-reduced-motion: reduce/);
    expect(source).toMatch(/import\("@\/lib\/landing-motion"\)/);
    expect(source).not.toMatch(/^\s*import [^(]*landing-motion/m);
    expect(source).toMatch(/"load"/);
  });
});
