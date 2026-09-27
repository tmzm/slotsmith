/**
 * Locales
 *
 * The provider that sets the language of every component, and the helper that
 * types a custom locale. The ready-made packs are separate entry points
 * (`slotsmith/locales/ar`), so an app bundles only the languages it imports.
 *
 * @packageDocumentation
 */

export { SlotsmithProvider, useSlotsmithLocale, type SlotsmithProviderProps } from "./context";
export { defineLocale } from "./defineLocale";
export { createNumber, createPlural, type PluralForms } from "./plural";
export type {
  LocaleDefinition,
  LocaleInput,
  LocaleSection,
  LocaleSectionName,
  LocaleSections,
  SlotsmithLocale,
  TextDirection,
} from "./types";
