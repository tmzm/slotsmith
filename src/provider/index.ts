/**
 * Provider
 *
 * `SlotsmithProvider` and the hook that reads it back. It carries the
 * language for now; it is the future home of any setting shared across
 * components (a theme, a size), so this is where they will land.
 *
 * @packageDocumentation
 */

export { SlotsmithProvider, useSlotsmithLocale, type SlotsmithProviderProps } from "./context";
