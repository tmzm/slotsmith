/**
 * Open Graph images
 *
 * One 1200×630 PNG per page and language, drawn in the site's dark palette:
 * the page title in the display face, its section as a gold `{tag}`, the
 * `<slot>{smith}` wordmark in a corner and a hairline frame. `satori` lays the
 * card out as SVG and `resvg` rasterises it.
 *
 * `satori` shapes the letters of one Arabic word correctly but lays words out
 * left to right and has no bidirectional text. An Arabic title is therefore
 * split into words here and set as a right-to-left wrapping row, with Latin
 * runs kept whole in the Latin display face.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { localePath, type Lang } from "@/i18n";
import { SITE } from "../../site.config.ts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The image's file name under `/og/`, without `.png`: ("en", "/") gives "index", ("ar", "/theming/") gives "ar/theming". */
export function ogSlug(lang: Lang, path: string): string {
  return localePath(lang, path).replace(/^\/|\/$/g, "") || "index";
}

/** The absolute URL of a page's image. */
export function ogUrl(lang: Lang, path: string): string {
  return `${SITE.url}/og/${ogSlug(lang, path)}.png`;
}

/** The dark palette of `styles/tokens.css`. The image has one look in both themes. */
const COLOR = { bg: "#0f0e0b", line: "#2e2a22", ink: "#ece9e2", muted: "#a29c90", gold: "#c9a14a" } as const;

const DISPLAY = "Big Shoulders";
const ARABIC_DISPLAY = "Alexandria";
const BODY = "Geist";
const MONO = "JetBrains Mono";

/** The faces the image uses, as `woff` (satori does not read `woff2`) from the packages the site serves its fonts from. */
const FONT_FILES = [
  { name: DISPLAY, weight: 900, file: "@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff" },
  { name: BODY, weight: 400, file: "@fontsource/geist/files/geist-latin-400-normal.woff" },
  { name: MONO, weight: 500, file: "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff" },
  { name: ARABIC_DISPLAY, weight: 800, file: "@fontsource/alexandria/files/alexandria-arabic-800-normal.woff" },
] as const;

type Weight = (typeof FONT_FILES)[number]["weight"];
interface Font {
  name: string;
  data: Buffer;
  weight: Weight;
  style: "normal";
}

let fonts: Promise<Font[]> | undefined;

/** Reads the font files once per process. Resolved from the working directory, which is `docs/` for the build and the tests. */
function loadFonts(): Promise<Font[]> {
  const require = createRequire(join(process.cwd(), "package.json"));
  fonts ??= Promise.all(
    FONT_FILES.map(async ({ name, weight, file }) => ({ name, weight, style: "normal" as const, data: await readFile(require.resolve(file)) })),
  );
  return fonts;
}

/** A satori element: the plain-object form of `React.createElement`. */
interface Node {
  type: string;
  props: { style: Record<string, string | number>; children?: string | Node | Node[] };
}

const box = (style: Record<string, string | number>, children?: string | Node | Node[]): Node => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

const FRAME_INSET = 28;
const PADDING = 52;
/** The width a title line may take. */
const TITLE_WIDTH = OG_WIDTH - 2 * (FRAME_INSET + PADDING);
/** The height the title block may take between the section tag and the footer: less for Latin capitals, which read as a solid block and need air above. */
const LATIN_HEIGHT = 300;
const ARABIC_HEIGHT = 310;

const ARABIC_LETTER = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
/** Vowel marks and the tatweel. The image leaves them out: satori does not position marks on their letters. */
const ARABIC_MARKS = /[ً-ٰٟـ]/g;
const MIRRORED: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };

interface Fit {
  size: number;
  lines: number;
}

/**
 * The largest type size at which `words` wrap into the title area, by a
 * greedy wrap with an average glyph width. The width factor errs wide, so the
 * real text never needs more lines than this predicts.
 *
 * @param words - The title's words with the width factor (advance ÷ font size) of each one's face.
 * @param sizes - Candidate sizes, largest first; the last is used when nothing fits.
 * @param leading - Line height as a multiple of the size.
 * @param space - Width of a word space as a multiple of the size.
 * @param maxHeight - The height the lines may take.
 */
function fit(words: { text: string; factor: number }[], sizes: readonly number[], leading: number, space: number, maxHeight: number): Fit {
  let last: Fit = { size: sizes[sizes.length - 1]!, lines: 1 };
  for (const size of sizes) {
    let lines = 1;
    let used = 0;
    let tooWide = false;
    for (const word of words) {
      const width = [...word.text].length * word.factor * size;
      if (width > TITLE_WIDTH) tooWide = true;
      if (used > 0 && used + space * size + width > TITLE_WIDTH) {
        lines += 1;
        used = width;
      } else {
        used += (used > 0 ? space * size : 0) + width;
      }
    }
    last = { size, lines };
    if (!tooWide && lines * size * leading <= maxHeight) return last;
  }
  return last;
}

const LATIN_SIZES = [184, 160, 136, 112, 96, 80, 68, 56, 48] as const;
const ARABIC_SIZES = [124, 108, 92, 80, 68, 58, 50, 42] as const;
/** Average advance ÷ font size: Big Shoulders 900 in capitals, and Alexandria 800. */
const LATIN_FACTOR = 0.5;
const ARABIC_FACTOR = 0.62;
/** Alexandria needs room for its descenders and the hamza above the next line. */
const ARABIC_LEADING = 1.4;

/** A title with no Arabic letters: one block of uppercase display type, wrapped by satori. */
function latinTitle(title: string, lang: Lang): Node {
  const text = title.toUpperCase();
  const { size } = fit(
    text.split(/\s+/).map((word) => ({ text: word, factor: LATIN_FACTOR })),
    LATIN_SIZES,
    0.9,
    0.22,
    LATIN_HEIGHT,
  );
  return box(
    {
      display: "block",
      width: "100%",
      fontFamily: DISPLAY,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 0.9,
      letterSpacing: "-0.005em",
      color: COLOR.ink,
      textAlign: lang === "ar" ? "right" : "left",
      wordBreak: "break-word",
    },
    text,
  );
}

/**
 * Splits one Arabic word into its letters and the punctuation around them, in
 * reading order, with brackets mirrored for a right-to-left line.
 */
function arabicRuns(word: string): string[] {
  const runs: string[] = [];
  for (const char of word) {
    const letter = ARABIC_LETTER.test(char) || /[\p{L}\p{N}]/u.test(char);
    const previous = runs[runs.length - 1];
    if (letter && previous !== undefined && /[\p{L}\p{N}]$/u.test(previous)) runs[runs.length - 1] = previous + char;
    else runs.push(letter ? char : (MIRRORED[char] ?? char));
  }
  return runs;
}

/**
 * A Latin run inside an Arabic title, in the Latin display face. Punctuation
 * that ends the run belongs to the Arabic sentence, so it goes on the run's left.
 */
function latinRun(text: string): Node {
  const end = /[:;,.!?،؛]+$/.exec(text)?.[0] ?? "";
  return box({ flexDirection: "row-reverse", alignItems: "baseline", fontFamily: DISPLAY, fontWeight: 900, letterSpacing: "-0.005em" }, [
    box({}, text.slice(0, text.length - end.length)),
    box({}, end),
  ]);
}

/** A title with Arabic letters: words set right to left in a wrapping row, Latin runs kept whole. */
function arabicTitle(title: string): Node {
  const words = title.replace(ARABIC_MARKS, "").split(/\s+/).filter(Boolean);
  // Neighbouring Latin words stay one left-to-right run ("React API").
  const groups: { text: string; arabic: boolean }[] = [];
  for (const word of words) {
    const arabic = ARABIC_LETTER.test(word);
    const previous = groups[groups.length - 1];
    if (!arabic && previous && !previous.arabic) previous.text += ` ${word}`;
    else groups.push({ text: word, arabic });
  }
  const { size } = fit(
    groups.map((group) => ({ text: group.arabic ? group.text : group.text.toUpperCase(), factor: group.arabic ? ARABIC_FACTOR : LATIN_FACTOR })),
    ARABIC_SIZES,
    ARABIC_LEADING,
    0.3,
    ARABIC_HEIGHT,
  );
  return box(
    { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "baseline", width: "100%", columnGap: size * 0.3, color: COLOR.ink, fontSize: size, lineHeight: ARABIC_LEADING },
    groups.map((group) =>
      group.arabic
        ? box(
            { flexDirection: "row-reverse", alignItems: "baseline", fontFamily: `${ARABIC_DISPLAY}, ${DISPLAY}`, fontWeight: 800 },
            arabicRuns(group.text).map((run) => box({}, run)),
          )
        : latinRun(group.text.toUpperCase()),
    ),
  );
}

const mark = (text: string): Node => box({ color: COLOR.gold }, text);

/** The `<slot>{smith}` wordmark: gold brackets and braces, letters in ink. Always left to right. */
function wordmark(): Node {
  return box({ fontFamily: MONO, fontWeight: 500, fontSize: 34, color: COLOR.ink }, [mark("<"), box({}, "slot"), mark(">{"), box({}, "smith"), mark("}")]);
}

/** The whole card as a satori element. */
function card(input: { title: string; section: string | null; lang: Lang }): Node {
  const rtl = input.lang === "ar";
  const row = rtl ? "row-reverse" : "row";
  const title = ARABIC_LETTER.test(input.title) ? arabicTitle(input.title) : latinTitle(input.title, input.lang);
  return box({ width: OG_WIDTH, height: OG_HEIGHT, backgroundColor: COLOR.bg, padding: FRAME_INSET }, [
    box({ flexDirection: "column", flexGrow: 1, border: `1px solid ${COLOR.line}`, padding: PADDING }, [
      // The section is a machine-flavoured label, so it is Latin and mono in both languages.
      box({ flexDirection: row, height: 40, fontFamily: MONO, fontWeight: 500, fontSize: 30, color: COLOR.gold }, input.section ? `{${input.section}}` : ""),
      box({ flexDirection: "column", flexGrow: 1, justifyContent: "flex-end", paddingBottom: 36, overflow: "hidden" }, [title]),
      box({ flexDirection: row, justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLOR.line}`, paddingTop: 28 }, [
        wordmark(),
        box({ fontFamily: BODY, fontWeight: 400, fontSize: 26, color: COLOR.muted }, new URL(SITE.url).host),
      ]),
    ]),
  ]);
}

/**
 * Draws a page's Open Graph image.
 *
 * @param input.title - The page's own title, without the site name.
 * @param input.section - A short Latin label shown as `{section}`, or null for none.
 * @param input.lang - Arabic mirrors the layout and right-aligns the title.
 * @returns A 1200×630 PNG.
 */
export async function renderOg(input: { title: string; section: string | null; lang: Lang }): Promise<Uint8Array> {
  const svg = await satori(card(input) as unknown as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts: await loadFonts() });
  // Every glyph is already a path, so resvg needs no fonts of its own.
  return new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
}
