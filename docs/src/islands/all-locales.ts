import type { SlotsmithLocale } from "slotsmith/locale";

/**
 * Every locale pack the library ships, for demos that switch between all of
 * them. Kept in its own module so only those demos download the packs.
 */
const modules = import.meta.glob<Record<string, SlotsmithLocale>>("../../../src/locales/*.ts", { eager: true });

export const ALL_LOCALES: readonly SlotsmithLocale[] = Object.values(modules).flatMap((module) => Object.values(module));
