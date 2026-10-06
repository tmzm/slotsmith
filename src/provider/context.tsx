import { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveLocale, type ResolvedLocale } from "../locale/resolve";
import type { LocaleInput, SlotsmithLocale, TextDirection } from "../locale/types";
import { mergeComponents, NO_COMPONENTS, type SlotsmithComponents } from "./components";

/**
 * Provider context value
 *
 * Everything a provider shares with the components below it, and merges
 * with an outer provider of the same kind: the language and the slot
 * overrides. Another shared setting, when it arrives, is one more field here
 * and one more line in `SlotsmithProvider`'s merge below, not a second
 * context or a second provider.
 */
export interface SlotsmithContextValue {
  locale: ResolvedLocale | undefined;
  packs: readonly SlotsmithLocale[];
  /** Slot overrides per component, already merged with every outer provider's. */
  components: SlotsmithComponents;
}

const NO_PACKS: readonly SlotsmithLocale[] = [];

/**
 * The shared context
 *
 * Exported so locale-specific code (`useLocaleSection`) can read it
 * directly; `useSlotsmithLocale` below is the public hook, and only exposes
 * the tag and direction it computes from this value.
 */
export const SlotsmithContext = createContext<SlotsmithContextValue>({
  locale: undefined,
  packs: NO_PACKS,
  components: NO_COMPONENTS,
});

/**
 * Provider props
 *
 * The language every component below reads, the packs a string resolves to,
 * and the slots every component below renders with.
 */
export interface SlotsmithProviderProps {
  /** A locale object, or the tag of one in `locales`. Defaults to the outer provider's. */
  locale?: LocaleInput;
  /** The packs a string `locale` may resolve to. Defaults to the outer provider's. */
  locales?: readonly SlotsmithLocale[];
  /**
   * Slot overrides for every component below, one map per component. Merged
   * with the outer provider's slot by slot; a component's own `components`
   * prop still wins. Keep the object's identity stable between renders.
   */
  components?: SlotsmithComponents;
  children?: ReactNode;
}

/**
 * SlotsmithProvider
 *
 * Sets the language and the slots of every slotsmith component below it. It
 * renders no element: set `dir` on the page yourself, from
 * `useSlotsmithLocale()`.
 *
 * `components` applies a design system once instead of on every component.
 * Each slot resolves in three layers: the built-in fallback, then this
 * provider's `components`, then the component's own `components` prop. A
 * nested provider merges with the outer one slot by slot, and inherits the
 * components it does not name. `slotProps` stay on each component.
 *
 * The data table's built-in page-size select is an `Autocomplete`, so it
 * follows `components.autocomplete`; a `PageSizeSelect` slot, from
 * `components.dataTable` or the table's own prop, replaces it altogether.
 * For that reason `components.autocomplete` receives every option type, the
 * table's page-size options included, and its slots must not assume one.
 *
 * @param props - See {@link SlotsmithProviderProps}.
 *
 * @example
 * ```tsx
 * import { SlotsmithProvider } from "slotsmith/provider";
 * import { ar } from "slotsmith/locales/ar";
 * import { fr } from "slotsmith/locales/fr";
 *
 * <SlotsmithProvider locale={language} locales={[ar, fr]}>
 *   <App />
 * </SlotsmithProvider>;
 * ```
 *
 * @example
 * ```tsx
 * // Defined once, outside any component, so its identity never changes.
 * const components: SlotsmithComponents = {
 *   dataTable: { Checkbox, Pagination },
 *   autocomplete: { Option },
 *   datePicker: { Day },
 *   fileUploader: { Progress },
 * };
 *
 * <SlotsmithProvider components={components}>
 *   <App />
 * </SlotsmithProvider>;
 * ```
 */
export function SlotsmithProvider({ locale, locales, components, children }: SlotsmithProviderProps) {
  const outer = useContext(SlotsmithContext);
  const packs = locales ?? outer.packs;
  const slots = useMemo(() => mergeComponents(outer.components, components), [outer.components, components]);
  const value = useMemo<SlotsmithContextValue>(
    () => ({ locale: locale === undefined ? outer.locale : resolveLocale(locale, packs), packs, components: slots }),
    [locale, packs, outer.locale, slots],
  );
  return <SlotsmithContext.Provider value={value}>{children}</SlotsmithContext.Provider>;
}

/**
 * useSlotsmithLocale
 *
 * The language set by the nearest provider, for an app that wants to set
 * `lang` and `dir` on its own markup.
 *
 * @returns The tag and direction; `en-US` and `ltr` outside a provider.
 */
export function useSlotsmithLocale(): { code: string; dir: TextDirection } {
  const { locale } = useContext(SlotsmithContext);
  return useMemo(() => ({ code: locale?.code ?? "en-US", dir: locale?.dir ?? "ltr" }), [locale]);
}
