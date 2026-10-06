/**
 * Fallback faces for the site's web fonts.
 *
 * Every web font is declared with `font-display: swap`, so text first paints
 * in a font already on the device and is laid out again when the web font
 * arrives. A system font of another width wraps the text differently, and
 * everything under it moves. Each face here is a local font scaled
 * (`size-adjust`) to the web font's average character width, with the web
 * font's ascent and descent, so the swap keeps every line where it was.
 *
 * The numbers were measured in Chrome: the advance width of the site's own
 * prose in the web font divided by its width in the local font, and the
 * ascent and descent the browser reports for the web font. The Arabic ones
 * were measured in the page's own stack, where spaces and digits come from
 * the Latin face. A local font that
 * is missing makes its face fail to load, and the next family in the stack is
 * used (`styles/tokens.css` lists them in this order).
 */
import type { Lang } from "@/i18n";

/** The Latin subset every Latin web font is cut to. */
export const LATIN_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

/** The Arabic subset the Arabic web fonts are cut to. */
export const ARABIC_RANGE =
  "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC";

/** A web font's vertical metrics, as fractions of the font size. */
interface Metrics {
  ascent: number;
  descent: number;
}

/** One fallback face: a local font standing in for one weight of a web font. */
export interface FallbackFace {
  /** The family name used in the font stacks. */
  family: string;
  weight: number;
  /** Names for `local()`, first match wins. All must share one width. */
  locals: string[];
  /** Web font width divided by the local font's width, in percent. */
  sizeAdjust: number;
  metrics: Metrics;
  range: string;
}

const GEIST: Metrics = { ascent: 1.005, descent: 0.295 };
const BIG_SHOULDERS: Metrics = { ascent: 0.986, descent: 0.215 };
const JETBRAINS_MONO: Metrics = { ascent: 1.02, descent: 0.3 };
const NOTO_SANS_ARABIC: Metrics = { ascent: 1.374, descent: 0.738 };
const ALEXANDRIA: Metrics = { ascent: 0.968, descent: 0.251 };

/** Arial and the fonts drawn to its widths on Linux. */
const ARIAL = ["Arial", "Liberation Sans", "Arimo"];
const ARIAL_BOLD = ["Arial Bold", "Arial-BoldMT", "Liberation Sans Bold", "Arimo Bold"];
/** Monospaced fonts with the 0.6 em advance JetBrains Mono has. */
const MONO_600 = ["Menlo", "Menlo Regular", "DejaVu Sans Mono", "Liberation Mono", "Courier New"];

const latin = (family: string, weight: number, locals: string[], sizeAdjust: number, metrics: Metrics): FallbackFace => ({
  family,
  weight,
  locals,
  sizeAdjust,
  metrics,
  range: LATIN_RANGE,
});

const arabic = (family: string, weight: number, locals: string[], sizeAdjust: number, metrics: Metrics): FallbackFace => ({
  family,
  weight,
  locals,
  sizeAdjust,
  metrics,
  range: ARABIC_RANGE,
});

/** Fallbacks for the Latin faces, on every page. */
export const LATIN_FALLBACKS: FallbackFace[] = [
  latin("Geist Fallback", 400, ARIAL, 103.17, GEIST),
  latin("Geist Fallback", 500, ARIAL, 105.54, GEIST),
  latin("Geist Fallback", 600, ARIAL_BOLD, 100.46, GEIST),
  latin("Big Shoulders Fallback", 900, ["Impact"], 101.08, BIG_SHOULDERS),
  latin("Big Shoulders Fallback 2", 900, ARIAL_BOLD, 77.46, BIG_SHOULDERS),
  latin("JetBrains Mono Fallback", 400, ["Consolas"], 109.12, JETBRAINS_MONO),
  latin("JetBrains Mono Fallback", 500, ["Consolas"], 109.12, JETBRAINS_MONO),
  latin("JetBrains Mono Fallback 2", 400, MONO_600, 100, JETBRAINS_MONO),
  latin("JetBrains Mono Fallback 2", 500, MONO_600, 100, JETBRAINS_MONO),
];

/** Fallbacks for the Arabic faces, on Arabic pages only. */
export const ARABIC_FALLBACKS: FallbackFace[] = [
  arabic("Noto Sans Arabic Fallback", 400, ["Tahoma"], 95.37, NOTO_SANS_ARABIC),
  arabic("Noto Sans Arabic Fallback", 500, ["Tahoma"], 97.75, NOTO_SANS_ARABIC),
  arabic("Noto Sans Arabic Fallback", 700, ["Tahoma Bold"], 90.29, NOTO_SANS_ARABIC),
  arabic("Noto Sans Arabic Fallback 2", 400, ["Arial"], 121.63, NOTO_SANS_ARABIC),
  arabic("Noto Sans Arabic Fallback 2", 500, ["Arial"], 124.66, NOTO_SANS_ARABIC),
  arabic("Noto Sans Arabic Fallback 2", 700, ["Arial Bold", "Arial-BoldMT"], 131.96, NOTO_SANS_ARABIC),
  arabic("Alexandria Fallback", 800, ["Tahoma Bold"], 110.68, ALEXANDRIA),
  arabic("Alexandria Fallback 2", 800, ["Arial Bold", "Arial-BoldMT"], 161.76, ALEXANDRIA),
];

const percent = (value: number) => `${Math.round(value * 100) / 100}%`;

/**
 * Writes one fallback face as an `@font-face` rule.
 *
 * The overrides are divided by the size adjustment because the browser scales
 * them with the glyphs, and the line must end up at the web font's height.
 *
 * @param face - The fallback face.
 * @returns The rule, minified.
 */
export function fallbackFaceCss(face: FallbackFace): string {
  const scale = face.sizeAdjust / 100;
  const src = face.locals.map((name) => `local("${name}")`).join(",");
  return (
    `@font-face{font-family:"${face.family}";font-style:normal;font-weight:${face.weight};src:${src};` +
    `size-adjust:${percent(face.sizeAdjust)};ascent-override:${percent((face.metrics.ascent / scale) * 100)};` +
    `descent-override:${percent((face.metrics.descent / scale) * 100)};line-gap-override:0%;unicode-range:${face.range}}`
  );
}

/**
 * The fallback faces a page declares.
 *
 * @param lang - The page language; Arabic pages add the Arabic fallbacks.
 * @returns The faces, in declaration order.
 */
export function fallbackFaces(lang: Lang): FallbackFace[] {
  return lang === "ar" ? [...LATIN_FALLBACKS, ...ARABIC_FALLBACKS] : LATIN_FALLBACKS;
}
