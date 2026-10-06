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
 *
 * A title too long for its area gets smaller type, then loses its end to an
 * ellipsis; it is never clipped. The landing's image marks its component
 * names in gold with `[brackets]`, as the hero does.
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

/**
 * The faces the image uses, as `woff` (satori does not read `woff2`) from the
 * packages the site serves its fonts from.
 *
 * The display face is Big Shoulders 800, not the site's 900: at 900 the thin
 * cut diagonals of M, N and W all but close, and at this size "SM" or "OM"
 * reads as two letters run together. That is how the 900 is drawn (a browser
 * shows the same); 800 keeps the weight and leaves the letters open.
 */
const FONT_FILES = [
  { name: DISPLAY, weight: 800, file: "@fontsource/big-shoulders/files/big-shoulders-latin-800-normal.woff" },
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
const BORDER = 1;
/** The width inside the frame, which a title line may take. */
const TITLE_WIDTH = OG_WIDTH - 2 * (FRAME_INSET + BORDER + PADDING);
/** The height the title may take between the section tag and the footer: less for Latin capitals, which read as a solid block and need air above. */
const LATIN_HEIGHT = 300;
const ARABIC_HEIGHT = 310;

const ARABIC_LETTER = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
/** Vowel marks. The image leaves them out: satori draws them on top of their letters. */
const ARABIC_MARKS = /[ً-ٰٟ]/g;
const MIRRORED: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };
/** Punctuation that ends a Latin run inside an Arabic sentence. */
const RUN_END = /[:;,.!?،؛؟…]+$/;
/** True for a word with no Arabic letters; Arabic punctuation after a Latin word ("React،") does not make it Arabic. */
const isLatin = (text: string) => !ARABIC_LETTER.test(text.replace(/[،؛؟]/g, ""));
const ELLIPSIS = "…";
const TATWEEL = "ـ";

const LATIN_SIZES = [184, 160, 136, 112, 96, 80, 68, 56, 48] as const;
const ARABIC_SIZES = [124, 108, 92, 80, 68, 58, 50, 42] as const;
/** Average advance ÷ font size, erring wide: Big Shoulders 800 in capitals, and Alexandria 800. */
const LATIN_FACTOR = 0.5;
const ARABIC_FACTOR = 0.62;
const LATIN_LEADING = 0.9;
/** Alexandria needs room for its descenders and the hamza above the next line. */
const ARABIC_LEADING = 1.4;
/** A word space ÷ font size. */
const LATIN_SPACE = 0.22;
const ARABIC_SPACE = 0.3;
/** Big Shoulders is tracked slightly open here, not at the site's −0.005em, so heavy neighbours do not touch at poster size. */
const LATIN_TRACKING = "0.012em";

/** A stretch of a word in one colour. */
interface Part {
  text: string;
  gold: boolean;
}
type Word = Part[];
/** What a line may not break: one word, or in an Arabic title neighbouring Latin words (which keep their left-to-right order) and a word joined to the next by a tatweel. */
type Unit = Word[];

const wordText = (word: Word) => word.map((part) => part.text).join("");
const unitText = (unit: Unit) => unit.map(wordText).join(" ");
const copyUnits = (units: Unit[]): Unit[] => units.map((unit) => unit.map((word) => word.map((part) => ({ ...part }))));

/**
 * Splits a title into words of coloured parts. With `marked`, a `[bracketed]`
 * phrase is drawn in gold and the brackets are dropped.
 */
function parseWords(title: string, marked: boolean): Word[] {
  const words: Word[] = [];
  let word: Word = [];
  (marked ? title.split(/\[([^\]]*)\]/) : [title]).forEach((segment, index) => {
    const gold = index % 2 === 1;
    for (const char of segment) {
      if (/\s/.test(char)) {
        if (word.length) words.push(word);
        word = [];
        continue;
      }
      const last = word[word.length - 1];
      if (last && last.gold === gold) last.text += char;
      else word.push({ text: char, gold });
    }
  });
  if (word.length) words.push(word);
  return words;
}

const widthOf = (text: string) => [...text].reduce((sum, char) => sum + (ARABIC_LETTER.test(char) ? ARABIC_FACTOR : LATIN_FACTOR), 0);

/**
 * The lines a greedy wrap of `units` takes at `size`, by average glyph widths.
 * The widths err wide, so the drawn text never needs more lines.
 *
 * @param breakable - True when a unit wider than a line may break inside (the Latin block); otherwise such a unit never fits.
 */
function countLines(units: Unit[], size: number, space: number, breakable: boolean): number {
  let lines = 1;
  let used = 0;
  for (const unit of units) {
    const width = (unit.reduce((sum, word) => sum + widthOf(wordText(word)), 0) + (unit.length - 1) * space) * size;
    if (used > 0 && used + space * size + width > TITLE_WIDTH) {
      lines += 1;
      used = 0;
    }
    if (width > TITLE_WIDTH) {
      if (!breakable) return Infinity;
      lines += Math.ceil(width / TITLE_WIDTH) - 1;
      used = width % TITLE_WIDTH;
    } else {
      used += (used > 0 ? space * size : 0) + width;
    }
  }
  return lines;
}

/** How a title is set: its type size and what is drawn of it. */
export interface TitleLayout {
  /** Font size in pixels. */
  size: number;
  /** The title as drawn: uppercase in the Latin face, and ending in an ellipsis when it was cut. */
  text: string;
  /** True when the title did not fit at the smallest size and was cut. */
  truncated: boolean;
}

interface Fitted {
  size: number;
  units: Unit[];
  truncated: boolean;
  arabic: boolean;
  /** True when the title is drawn word by word (Arabic, or with gold phrases) instead of as one block of text. */
  byWord: boolean;
}

/**
 * Picks the largest type size at which the title fits its area. A title that
 * does not fit at the smallest size loses words from its end, then letters,
 * and ends in an ellipsis, so nothing is ever clipped.
 */
function fitTitle(title: string, marked: boolean): Fitted {
  const arabic = ARABIC_LETTER.test(title);
  const words = parseWords(arabic ? title.replace(ARABIC_MARKS, "") : title.toUpperCase(), marked);
  const byWord = arabic || words.some((word) => word.some((part) => part.gold));
  // In an Arabic title neighbouring Latin words stay one left-to-right run ("React API"), in capitals like any Latin display text.
  const units: Unit[] = [];
  for (const word of words) {
    const previous = units[units.length - 1];
    const latin = arabic && isLatin(wordText(word));
    const cased = latin ? word.map((part) => ({ ...part, text: part.text.toUpperCase() })) : word;
    // A word that ends in a tatweel ("لـ React") is written as one with the next, so the line never breaks between them.
    if (previous && ((latin && isLatin(wordText(previous[previous.length - 1]!))) || unitText(previous).endsWith(TATWEEL))) previous.push(cased);
    else units.push([cased]);
  }
  const sizes = arabic ? ARABIC_SIZES : LATIN_SIZES;
  const leading = arabic ? ARABIC_LEADING : LATIN_LEADING;
  const space = arabic ? ARABIC_SPACE : LATIN_SPACE;
  const maxHeight = arabic ? ARABIC_HEIGHT : LATIN_HEIGHT;
  const fits = (candidate: Unit[], size: number) => countLines(candidate, size, space, !byWord) * size * leading <= maxHeight;

  for (const size of sizes) if (fits(units, size)) return { size, units, truncated: false, arabic, byWord };

  const size = sizes[sizes.length - 1]!;
  const kept = copyUnits(units);
  const withEllipsis = () => {
    const copy = copyUnits(kept);
    copy[copy.length - 1]?.at(-1)?.push({ text: ELLIPSIS, gold: false });
    return copy;
  };
  while (kept.length > 0 && !fits(withEllipsis(), size)) {
    const unit = kept[kept.length - 1]!;
    if (kept.length > 1 || unit.length > 1) {
      // Drop the last word.
      unit.pop();
      if (unit.length === 0) kept.pop();
      continue;
    }
    // One word is left and it is too long by itself: drop its last letter.
    const word = unit[0]!;
    const part = word[word.length - 1]!;
    part.text = [...part.text].slice(0, -1).join("");
    if (!part.text) word.pop();
    if (word.length === 0) break;
  }
  return { size, units: withEllipsis(), truncated: true, arabic, byWord };
}

/**
 * How `renderOg` sets a title: exposed so the fitting can be tested without reading pixels.
 *
 * @param title - The title as given.
 * @param marked - True when `[brackets]` in the title mark gold phrases.
 */
export function layoutTitle(title: string, marked = false): TitleLayout {
  const { size, units, truncated } = fitTitle(title, marked);
  return { size, text: units.map(unitText).join(" "), truncated };
}

const colorOf = (part: Part) => (part.gold ? COLOR.gold : COLOR.ink);

/**
 * Splits a stretch of an Arabic word into its letters and the punctuation
 * around them, in reading order, with brackets mirrored for a right-to-left line.
 */
function arabicRuns(text: string): string[] {
  const runs: string[] = [];
  for (const char of text) {
    const letter = /[\p{L}\p{N}]/u.test(char);
    const previous = runs[runs.length - 1];
    if (letter && previous !== undefined && /[\p{L}\p{N}]$/u.test(previous)) runs[runs.length - 1] = previous + char;
    else runs.push(letter ? char : (MIRRORED[char] ?? char));
  }
  return runs;
}

const LATIN_STYLE = { fontFamily: DISPLAY, fontWeight: 800, letterSpacing: LATIN_TRACKING } as const;

/** One Latin word: its parts side by side, left to right. */
const latinWord = (word: Word): Node =>
  box(
    { alignItems: "baseline" },
    word.map((part) => box({ color: colorOf(part) }, part.text)),
  );

/**
 * A Latin run inside an Arabic title, in the Latin display face. Punctuation
 * that ends the run belongs to the Arabic sentence, so it goes on the run's left.
 */
function latinRun(run: Word[], gap: number): Node {
  const words = copyUnits([run])[0]!;
  const lastPart = words[words.length - 1]?.at(-1);
  const end = lastPart ? (RUN_END.exec(lastPart.text)?.[0] ?? "") : "";
  if (lastPart && end) lastPart.text = lastPart.text.slice(0, lastPart.text.length - end.length);
  return box({ flexDirection: "row-reverse", alignItems: "baseline", ...LATIN_STYLE }, [
    box({ alignItems: "baseline", columnGap: gap }, words.map(latinWord)),
    box({ color: COLOR.ink }, end),
  ]);
}

/** One Arabic word, right to left, with any Latin letters attached to it in the Latin face. */
const arabicWord = (word: Word): Node =>
  box(
    { flexDirection: "row-reverse", alignItems: "baseline", fontFamily: `${ARABIC_DISPLAY}, ${DISPLAY}`, fontWeight: 800 },
    word.flatMap((part) => arabicRuns(part.text).map((run) => box({ color: colorOf(part) }, run))),
  );

/** One unit of an Arabic title: its Arabic words and Latin runs, placed right to left. */
function arabicUnit(unit: Unit, size: number): Node {
  const items: Node[] = [];
  let latin: Word[] = [];
  const flush = () => {
    if (latin.length) items.push(latinRun(latin, size * LATIN_SPACE));
    latin = [];
  };
  for (const word of unit) {
    if (isLatin(wordText(word))) {
      latin.push(word);
      continue;
    }
    flush();
    items.push(arabicWord(word));
  }
  flush();
  return items.length === 1 ? items[0]! : box({ flexDirection: "row-reverse", alignItems: "baseline", columnGap: size * ARABIC_SPACE }, items);
}

/** The title block. */
function titleNode(title: string, lang: Lang, marked: boolean): Node {
  const { size, units, arabic, byWord } = fitTitle(title, marked);
  const rtl = lang === "ar";
  if (!byWord) {
    // Plain Latin: one block, wrapped by satori, which also breaks a word longer than a line.
    return box(
      { display: "block", width: TITLE_WIDTH, ...LATIN_STYLE, fontSize: size, lineHeight: LATIN_LEADING, color: COLOR.ink, textAlign: rtl ? "right" : "left", wordBreak: "break-word" },
      units.map(unitText).join(" "),
    );
  }
  if (!arabic) {
    return box(
      { flexWrap: "wrap", alignItems: "baseline", justifyContent: rtl ? "flex-end" : "flex-start", width: TITLE_WIDTH, columnGap: size * LATIN_SPACE, ...LATIN_STYLE, fontSize: size, lineHeight: LATIN_LEADING },
      units.map((unit) => latinWord(unit[0]!)),
    );
  }
  // satori shapes one Arabic word but has no bidirectional text, so the words are placed right to left here.
  return box(
    { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "baseline", width: TITLE_WIDTH, columnGap: size * ARABIC_SPACE, fontSize: size, lineHeight: ARABIC_LEADING },
    units.map((unit) => arabicUnit(unit, size)),
  );
}

const mark = (text: string): Node => box({ color: COLOR.gold }, text);

/** The `<slot>{smith}` wordmark: gold brackets and braces, letters in ink. Always left to right. */
function wordmark(): Node {
  return box({ fontFamily: MONO, fontWeight: 500, fontSize: 34, color: COLOR.ink }, [mark("<"), box({}, "slot"), mark(">{"), box({}, "smith"), mark("}")]);
}

/** What one image shows. */
export interface OgInput {
  title: string;
  section: string | null;
  lang: Lang;
  marked?: boolean;
}

/** The whole card as a satori element. */
function card(input: OgInput): Node {
  const rtl = input.lang === "ar";
  const row = rtl ? "row-reverse" : "row";
  const title = titleNode(input.title, input.lang, input.marked === true);
  return box({ width: OG_WIDTH, height: OG_HEIGHT, backgroundColor: COLOR.bg, padding: FRAME_INSET }, [
    box({ flexDirection: "column", flexGrow: 1, border: `${BORDER}px solid ${COLOR.line}`, padding: PADDING }, [
      // The section is a machine-flavoured label, so it is Latin and mono in both languages.
      box({ flexDirection: row, width: TITLE_WIDTH, height: 40, fontFamily: MONO, fontWeight: 500, fontSize: 30, color: COLOR.gold }, input.section ? `{${input.section}}` : ""),
      box({ flexDirection: "column", flexGrow: 1, width: TITLE_WIDTH, justifyContent: "flex-end", paddingBottom: 36, overflow: "hidden" }, [title]),
      box({ flexDirection: row, width: TITLE_WIDTH, justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${COLOR.line}`, paddingTop: 28 }, [
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
 * @param input.marked - True when `[brackets]` in the title mark phrases to draw in gold.
 * @returns A 1200×630 PNG.
 */
export async function renderOg(input: OgInput): Promise<Uint8Array> {
  const svg = await satori(card(input) as unknown as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts: await loadFonts() });
  // Every glyph is already a path, so resvg needs no fonts of its own.
  return new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
}
