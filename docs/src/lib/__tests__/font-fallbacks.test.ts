import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARABIC_FALLBACKS, ARABIC_RANGE, LATIN_FALLBACKS, LATIN_RANGE, fallbackFaceCss, fallbackFaces } from "@/lib/font-fallbacks";

const tokens = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf8");
/** Every `"… Fallback"` family a font stack in tokens.css names. */
const stackFamilies = (css: string) => new Set([...css.matchAll(/"([^"]+ Fallback(?: \d)?)"/g)].map((match) => match[1] ?? ""));

describe("fallbackFaceCss", () => {
  it("scales the local font and divides the web font's metrics by the scale", () => {
    const css = fallbackFaceCss({
      family: "Example Fallback",
      weight: 400,
      locals: ["Arial", "Liberation Sans"],
      sizeAdjust: 125,
      metrics: { ascent: 1, descent: 0.25 },
      range: "U+0000-00FF",
    });
    expect(css).toBe(
      '@font-face{font-family:"Example Fallback";font-style:normal;font-weight:400;src:local("Arial"),local("Liberation Sans");' +
        "size-adjust:125%;ascent-override:80%;descent-override:20%;line-gap-override:0%;unicode-range:U+0000-00FF}",
    );
  });
});

describe("fallbackFaces", () => {
  it("adds the Arabic faces on Arabic pages only", () => {
    expect(fallbackFaces("en")).toEqual(LATIN_FALLBACKS);
    expect(fallbackFaces("ar")).toEqual([...LATIN_FALLBACKS, ...ARABIC_FALLBACKS]);
  });

  it("keeps each face inside its web font's subset", () => {
    expect(LATIN_FALLBACKS.every((face) => face.range === LATIN_RANGE)).toBe(true);
    expect(ARABIC_FALLBACKS.every((face) => face.range === ARABIC_RANGE)).toBe(true);
  });

  it("declares every fallback family the font stacks name, and no other", () => {
    const declared = new Set(fallbackFaces("ar").map((face) => face.family));
    expect([...stackFamilies(tokens)].sort()).toEqual([...declared].sort());
  });

  it("declares the Latin stacks' fallbacks on English pages", () => {
    const [latinStacks = ""] = tokens.split('html[lang="ar"]');
    const declared = new Set(fallbackFaces("en").map((face) => face.family));
    expect([...stackFamilies(latinStacks)].every((family) => declared.has(family))).toBe(true);
  });
});
