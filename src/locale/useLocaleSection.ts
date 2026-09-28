import { useContext, useMemo } from "react";
import { SlotsmithContext } from "../provider/context";
import { resolveLocale, sectionOf } from "./resolve";
import type { LocaleInput, LocaleSectionName, LocaleSections } from "./types";

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
  const context = useContext(SlotsmithContext);
  return useMemo(() => {
    const resolved = locale === undefined ? context.locale : resolveLocale(locale, context.packs);
    return { code: resolved?.code, labels: sectionOf(resolved, name) };
  }, [locale, context, name]);
}
