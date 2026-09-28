import { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveLocale, type ResolvedLocale } from "../locale/resolve";
import type { LocaleInput, SlotsmithLocale, TextDirection } from "../locale/types";

/**
 * Provider context value
 *
 * Everything a provider shares with the components below it, and merges
 * with an outer provider of the same kind. Today that is only the language;
 * a shared theme or size, when they arrive, are one more field here and one
 * more line in `SlotsmithProvider`'s merge below, not a second context or a
 * second provider.
 */
export interface SlotsmithContextValue {
  locale: ResolvedLocale | undefined;
  packs: readonly SlotsmithLocale[];
}

const NO_PACKS: readonly SlotsmithLocale[] = [];

/**
 * The shared context
 *
 * Exported so locale-specific code (`useLocaleSection`) can read it
 * directly; `useSlotsmithLocale` below is the public hook, and only exposes
 * the tag and direction it computes from this value.
 */
export const SlotsmithContext = createContext<SlotsmithContextValue>({ locale: undefined, packs: NO_PACKS });

/**
 * Provider props
 *
 * The language every component below reads, and the packs a string resolves
 * to.
 */
export interface SlotsmithProviderProps {
  /** A locale object, or the tag of one in `locales`. Defaults to the outer provider's. */
  locale?: LocaleInput;
  /** The packs a string `locale` may resolve to. Defaults to the outer provider's. */
  locales?: readonly SlotsmithLocale[];
  children?: ReactNode;
}

/**
 * SlotsmithProvider
 *
 * Sets the language of every slotsmith component below it. It renders no
 * element: set `dir` on the page yourself, from `useSlotsmithLocale()`.
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
 */
export function SlotsmithProvider({ locale, locales, children }: SlotsmithProviderProps) {
  const outer = useContext(SlotsmithContext);
  const packs = locales ?? outer.packs;
  const value = useMemo<SlotsmithContextValue>(
    () => ({ locale: locale === undefined ? outer.locale : resolveLocale(locale, packs), packs }),
    [locale, packs, outer.locale],
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
