import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import SampleIsland from "@/islands/SampleIsland";

async function render(name: string, lang: "en" | "ar" = "en"): Promise<string> {
  const stream = await renderToReadableStream(createElement(SampleIsland, { name, lang }));
  await stream.allReady;
  return new Response(stream).text();
}

describe("SampleIsland", () => {
  it("server-renders the lazy sample in full, not a fallback", async () => {
    const html = await render("smoke/hello-table");
    expect(html.match(/sdt__row/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(html).toContain('dir="ltr"');
  });

  it("renders Arabic pages in Arabic, right to left", async () => {
    const html = await render("smoke/hello-table", "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toMatch(/[؀-ۿ]/);
  });

  it("keeps English demos in English", async () => {
    expect(await render("smoke/hello-table")).not.toMatch(/[؀-ۿ]/);
  });

  it("never imports a locale pack statically, so packs stay out of the first load", () => {
    const source = readFileSync(new URL("../SampleIsland.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/^import[^;]*["']slotsmith\/locales\//m);
  });

  it("fails the render with the bad name instead of rendering nothing", async () => {
    await expect(render("data-table/quik-start")).rejects.toThrow('Unknown sample "data-table/quik-start"');
  });

  it("returns an element when called, so Astro's renderer check still recognises it", () => {
    // Astro detects React components by calling them and swallowing errors; a throw here would hide the bad name.
    expect(() => SampleIsland({ name: "data-table/quik-start", lang: "en" })).not.toThrow();
  });
});
