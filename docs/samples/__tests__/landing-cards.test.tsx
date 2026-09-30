/// <reference types="astro/client" />
import { createElement, type ComponentType } from "react";
import { renderToReadableStream } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteLocale from "@/islands/SiteLocale";
import type { Lang } from "@/i18n";

/** Each landing card's sample and the class prefix its component's root carries. */
const CARDS = [
  { slug: "data-table", prefix: "sdt" },
  { slug: "autocomplete", prefix: "sac" },
  { slug: "date-picker", prefix: "sdp" },
  { slug: "file-uploader", prefix: "sfu" },
] as const;

/** Server-renders a card sample in the page's language, as SampleIsland does. */
async function render(slug: string, lang: Lang): Promise<string> {
  const { default: Sample } = (await import(`../landing/card-${slug}.tsx`)) as { default: ComponentType };
  const stream = await renderToReadableStream(createElement(SiteLocale, { lang, children: createElement(Sample) }));
  await stream.allReady;
  return new Response(stream).text();
}

/** The class list of the first element in the markup. */
function rootClasses(html: string): string[] {
  return /^<[a-z]+[^>]*?\sclass="([^"]*)"/.exec(html)?.[1]?.split(/\s+/) ?? [];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(CARDS)("landing card $slug", ({ slug, prefix }) => {
  it("renders without console errors, its root carrying the component's class prefix", async () => {
    const error = vi.spyOn(console, "error");
    const html = await render(slug, "en");
    expect(error).not.toHaveBeenCalled();
    expect(rootClasses(html).some((name) => name === prefix || name.startsWith(`${prefix}-`) || name.startsWith(`${prefix}__`))).toBe(true);
  });

  it("renders its labels in Arabic on Arabic pages", async () => {
    const error = vi.spyOn(console, "error");
    const html = await render(slug, "ar");
    expect(error).not.toHaveBeenCalled();
    expect(html).toMatch(/[؀-ۿ]/);
  });
});

describe("landing card data-table", () => {
  it("shows four rows and no pagination", async () => {
    const html = await render("data-table", "en");
    const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/.exec(html)?.[1] ?? "";
    expect(body.match(/<tr\b/g)?.length ?? 0).toBe(4);
    expect(html).not.toContain("sdt__pagination");
  });
});
