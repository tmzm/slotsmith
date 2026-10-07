/** U+2066 LEFT-TO-RIGHT ISOLATE. */
const LRI = "⁦";

/** U+2068 FIRST STRONG ISOLATE. */
const FSI = "⁨";

/** U+2069 POP DIRECTIONAL ISOLATE. */
const PDI = "⁩";

/**
 * Isolated
 *
 * Writes a value that may be in either direction, such as a file name, into
 * right-to-left text. The value is wrapped, whole, in a first-strong isolate:
 * it takes the direction of its own first letter, so a Latin name keeps its
 * order (`report.v2.pdf` does not read from the wrong end) and an Arabic one
 * still reads right to left, and its punctuation never joins the words
 * around it. The isolates are invisible format characters that screen
 * readers skip.
 *
 * @param text - The value, as it is; commas in it are kept.
 * @returns The isolated value.
 *
 * @example
 * ```ts
 * isolated("report.v2.pdf"); // "⁨report.v2.pdf⁩"
 * ```
 */
export function isolated(text: string): string {
  return `${FSI}${text}${PDI}`;
}

/**
 * Isolated list
 *
 * Writes a comma-separated list of left-to-right tokens, such as an `accept`
 * list of MIME types and extensions, into right-to-left text. Each token is
 * wrapped in a left-to-right isolate, so the bidi algorithm cannot reorder
 * it (`image/*` would otherwise read `*\/image`), and the tokens are joined
 * with the language's own separator, so the list still reads right to left.
 * The isolates are invisible format characters that screen readers skip.
 *
 * @param list - The tokens, comma-separated; spaces and empty entries are dropped.
 * @param separator - What goes between two tokens, such as `"، "` for Arabic.
 * @returns The isolated list, in the given order.
 *
 * @example
 * ```ts
 * isolatedList("image/*,.pdf", "، "); // "⁦image/*⁩، ⁦.pdf⁩"
 * ```
 */
export function isolatedList(list: string, separator: string): string {
  return list
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => `${LRI}${token}${PDI}`)
    .join(separator);
}
