/**
 * Locales
 *
 * The helper that types a custom locale, and the plural and number
 * formatting the shipped packs build their strings with. The ready-made
 * packs are separate entry points (`slotsmith/locales/ar`), so an app
 * bundles only the languages it imports. `SlotsmithProvider` now lives in
 * `slotsmith/provider`; it is re-exported here for compatibility.
 *
 * @packageDocumentation
 */

/**
 * The provider is imported by its `index` in full: in the build output a
 * `provider.js` script sits beside the `provider` folder, and a bare
 * `../provider` in the declarations would resolve to the script.
 */

/**
 * @deprecated Import from "slotsmith/provider".
 */
export { SlotsmithProvider } from "../provider/index";
/**
 * @deprecated Import from "slotsmith/provider".
 */
export { useSlotsmithLocale } from "../provider/index";
/**
 * @deprecated Import from "slotsmith/provider".
 */
export type { SlotsmithProviderProps } from "../provider/index";
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
