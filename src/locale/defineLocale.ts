import { directionOf } from "./direction";
import type { LocaleDefinition, SlotsmithLocale } from "./types";

/**
 * Define a locale
 *
 * Types a custom locale and fills in its direction. Each component's section
 * is optional, but one that is present has to be complete: a missing key is a
 * type error here rather than an English word in a translated screen.
 *
 * @param definition - The tag, optionally the direction, and the sections.
 * @returns The locale, ready for a `locale` prop or the provider's `locales`.
 *
 * @example
 * ```ts
 * const nl = defineLocale({
 *   code: "nl",
 *   table: { ...defaultLabels, empty: "Geen gegevens", retry: "Opnieuw" },
 * });
 * ```
 */
export function defineLocale(definition: LocaleDefinition): SlotsmithLocale {
  return { ...definition, dir: definition.dir ?? directionOf(definition.code) };
}
