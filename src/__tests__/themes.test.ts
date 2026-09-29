/** @vitest-environment node */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dir = resolve(process.cwd(), "src", "themes");
const themes = readdirSync(dir).filter((file) => file.endsWith(".css"));

/** Relative luminance of a `#rrggbb` colour, per WCAG 2. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** The two blocks of a theme file, as token maps. */
const blocks = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector!.trim(),
    tokens: Object.fromEntries(
      [...body!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]),
    ) as Record<string, string>,
    properties: [...body!.matchAll(/([\w-]+)\s*:/g)].map(([, name]) => name!),
  }));

it("ships the six themes", () => {
  expect(themes.sort()).toEqual(["contrast.css", "forest.css", "minimal.css", "ocean.css", "soft.css", "sunset.css"]);
});

describe.each(themes)("%s", (file) => {
  const parsed = blocks(readFileSync(resolve(dir, file), "utf8"));
  const minimum = file === "contrast.css" ? 7 : 4.5;

  it("has a light and a dark block", () => {
    expect(parsed.map((block) => block.selector.replace(/\s+/g, " "))).toEqual([
      ":root",
      '.dark, [data-theme="dark"]',
    ]);
  });

  it("sets shared tokens and nothing else", () => {
    for (const block of parsed) {
      for (const property of block.properties) expect(property).toMatch(/^--ss-/);
    }
  });

  it.each([0, 1])("keeps block %i readable", (index) => {
    const tokens = parsed[index]!.tokens;
    expect(contrast(tokens["--ss-text"]!, tokens["--ss-surface"]!)).toBeGreaterThanOrEqual(minimum);
    expect(contrast(tokens["--ss-muted"]!, tokens["--ss-surface"]!)).toBeGreaterThanOrEqual(minimum);
    expect(contrast(tokens["--ss-on-accent"]!, tokens["--ss-accent"]!)).toBeGreaterThanOrEqual(minimum);
    expect(contrast(tokens["--ss-danger"]!, tokens["--ss-surface"]!)).toBeGreaterThanOrEqual(minimum === 7 ? 7 : 4.5);
  });
});
