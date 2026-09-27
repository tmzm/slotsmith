import type { TextDirection } from "./types";

/**
 * Right-to-left languages
 *
 * The primary subtags written right to left. `Intl.Locale`'s text info is not
 * available everywhere the library runs, so the list is the source of truth.
 */
const RTL_LANGUAGES = new Set(["ar", "arc", "ckb", "dv", "fa", "he", "ks", "ps", "sd", "ug", "ur", "yi"]);

/**
 * Direction of a locale
 *
 * @param code - A BCP 47 tag.
 * @returns `rtl` when the tag's language is written right to left, `ltr` otherwise.
 */
export function directionOf(code: string): TextDirection {
  const language = code.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
}
