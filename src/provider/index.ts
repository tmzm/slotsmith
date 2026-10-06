/**
 * Provider
 *
 * `SlotsmithProvider` and the hook that reads it back. It carries the
 * language and the slot overrides (`components`) shared by every component
 * below it, and is where any further shared setting will land.
 *
 * @packageDocumentation
 */

export { SlotsmithProvider, useSlotsmithLocale, type SlotsmithProviderProps } from "./context";
export type { SlotsmithComponentName, SlotsmithComponents } from "./components";
