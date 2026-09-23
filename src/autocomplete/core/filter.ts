import type { GetOptionLabel, OptionFilter } from "./types";

/**
 * Fold
 *
 * Lowercases and strips diacritics, so "Boråstapeter" is found by typing
 * "boras". `normalize` is in every browser this library supports; the guard is
 * for exotic runtimes where it is missing rather than for old browsers.
 *
 * @param text - The text to fold.
 * @returns The folded text.
 */
export function fold(text: string): string {
  const lower = text.toLowerCase();
  return typeof lower.normalize === "function"
    ? lower.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    : lower;
}

/**
 * Default filter
 *
 * Substring match on the label, case- and accent-insensitive.
 *
 * @typeParam TOption - The option type.
 * @param getOptionLabel - Reads an option's text.
 * @returns A predicate for {@link OptionFilter}.
 *
 * @example
 * ```tsx
 * <Autocomplete filter={defaultFilter((country) => country.name)} />
 * ```
 */
export function defaultFilter<TOption>(
  getOptionLabel: GetOptionLabel<TOption>,
): (option: TOption, query: string) => boolean {
  return (option, query) => fold(getOptionLabel(option)).includes(fold(query));
}

/**
 * Filter options
 *
 * Narrows the options against the search text.
 *
 * @typeParam TOption - The option type.
 * @param options - Every option.
 * @param query - The search text.
 * @param filter - `false` to filter nothing, a predicate, or `undefined` for the default.
 * @param getOptionLabel - Reads an option's text.
 * @returns The options to render.
 */
export function filterOptions<TOption>(
  options: TOption[],
  query: string,
  filter: OptionFilter<TOption> | undefined,
  getOptionLabel: GetOptionLabel<TOption>,
): TOption[] {
  if (filter === false || !query) return options;
  const match = typeof filter === "function" ? filter : defaultFilter(getOptionLabel);
  return options.filter((option) => match(option, query));
}

/**
 * Typeahead match
 *
 * Finds the option a run of typed characters points at, the way a native
 * `<select>` does: prefix first, and only then a substring, so typing "ca"
 * lands on "Canada" rather than "Africa".
 *
 * Searching starts *after* the current index so repeated presses of the same
 * letter cycle, but a longer buffer restarts from the top — otherwise typing
 * "ca" after landing on "Canada" would skip past it.
 *
 * @typeParam TOption - The option type.
 * @param options - The options in render order.
 * @param buffer - What has been typed so far.
 * @param from - The current highlight, or -1.
 * @param getOptionLabel - Reads an option's text.
 * @param isDisabled - Options that cannot be landed on.
 * @returns The index to highlight, or -1.
 */
export function typeaheadMatch<TOption>(
  options: TOption[],
  buffer: string,
  from: number,
  getOptionLabel: GetOptionLabel<TOption>,
  isDisabled?: (option: TOption) => boolean,
): number {
  if (!buffer || options.length === 0) return -1;

  /**
   * A run of one repeated character means "the next one starting with it",
   * the way a native `<select>` behaves — so "aaa" cycles through the options
   * beginning with "a" rather than looking for the literal string.
   */
  const repeated = buffer.length > 1 && [...buffer].every((character) => character === buffer[0]);
  const cycling = buffer.length === 1 || repeated;
  const needle = fold(repeated ? buffer[0]! : buffer);
  const start = cycling ? from + 1 : 0;

  const order = Array.from({ length: options.length }, (_, step) => (start + step) % options.length);

  for (const test of [
    (label: string) => label.startsWith(needle),
    (label: string) => label.includes(needle),
  ]) {
    for (const index of order) {
      const option = options[index]!;
      if (isDisabled?.(option)) continue;
      if (test(fold(getOptionLabel(option)))) return index;
    }
  }

  return -1;
}
