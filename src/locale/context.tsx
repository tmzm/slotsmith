import { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveLocale, sectionOf, type ResolvedLocale } from "./resolve";
import type {
  LocaleInput,
  LocaleSectionName,
  LocaleSections,
  SlotsmithLocale,
  TextDirection,
} from "./types";

interface LocaleContextValue {
  locale: ResolvedLocale | undefined;
  packs: readonly SlotsmithLocale[];
}

const NO_PACKS: readonly SlotsmithLocale[] = [];
const LocaleContext = createContext<LocaleContextValue>({ locale: undefined, packs: NO_PACKS });

/**
 * Provider props
 *
 * The language every component below reads, and the packs a string resolves to.
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
 * import { SlotsmithProvider } from "slotsmith/locale";
 * import { ar } from "slotsmith/locales/ar";
 * import { fr } from "slotsmith/locales/fr";
 *
 * <SlotsmithProvider locale={language} locales={[ar, fr]}>
 *   <App />
 * </SlotsmithProvider>;
 * ```
 */
export function SlotsmithProvider({ locale, locales, children }: SlotsmithProviderProps) {
  const outer = useContext(LocaleContext);
  const packs = locales ?? outer.packs;
  const value = useMemo<LocaleContextValue>(
    () => ({ locale: locale === undefined ? outer.locale : resolveLocale(locale, packs), packs }),
    [locale, packs, outer.locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
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
  const { locale } = useContext(LocaleContext);
  return useMemo(() => ({ code: locale?.code ?? "en-US", dir: locale?.dir ?? "ltr" }), [locale]);
}

/**
 * useLocaleSection
 *
 * What one component reads: its labels in the active language and the tag to
 * format with. A component's own `locale` replaces the provider's.
 *
 * @param name - The component's section.
 * @param locale - The component's own `locale` prop, when it has one.
 * @returns The tag and the labels; both `undefined` when no locale is set.
 */
export function useLocaleSection<K extends LocaleSectionName>(
  name: K,
  locale?: LocaleInput,
): { code: string | undefined; labels: LocaleSections[K] | undefined } {
  const context = useContext(LocaleContext);
  return useMemo(() => {
    const resolved = locale === undefined ? context.locale : resolveLocale(locale, context.packs);
    return { code: resolved?.code, labels: sectionOf(resolved, name) };
  }, [locale, context, name]);
}
