/**
 * Plural forms
 *
 * One string per plural category the language uses. `{count}` is replaced by
 * the formatted number. Only `other` is required.
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/**
 * Safe tag
 *
 * @param code - A BCP 47 tag, possibly malformed.
 * @returns The tag when `Intl` accepts it, `en` otherwise, so a bad tag
 *   degrades to English formatting instead of throwing during render.
 */
export function safeTag(code: string): string {
  try {
    return Intl.getCanonicalLocales(code)[0] ?? "en";
  } catch {
    return "en";
  }
}

/**
 * Number formatter
 *
 * @param code - A BCP 47 tag.
 * @returns A function that writes a number the way the locale does.
 */
export function createNumber(code: string): (value: number) => string {
  const format = new Intl.NumberFormat(safeTag(code));
  return (value) => format.format(value);
}

/**
 * Plural picker
 *
 * @param code - A BCP 47 tag.
 * @returns A function that picks the form for a count and writes the count into it.
 *
 * @example
 * ```ts
 * const plural = createPlural("en");
 * plural(3, { one: "{count} file", other: "{count} files" }); // "3 files"
 * ```
 */
export function createPlural(code: string): (count: number, forms: PluralForms) => string {
  const rules = new Intl.PluralRules(safeTag(code));
  const number = createNumber(code);
  return (count, forms) => (forms[rules.select(count)] ?? forms.other).replaceAll("{count}", number(count));
}
