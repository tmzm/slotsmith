/**
 * SiteLocale
 *
 * The slotsmith locale of a page around a demo: English, the Arabic pack on
 * Arabic pages, or every pack the library ships for the demos that switch
 * between them. Used by SampleIsland and the swap demo.
 *
 * Locale packs are never in the first load: the Arabic pack is imported only
 * on Arabic pages, the same lazy way on the server and the client, so the
 * first client render matches the prerendered HTML. There is no Suspense
 * boundary on purpose: on the server the render waits for the pack, and on the
 * client hydration keeps the server HTML meanwhile.
 */
import { lazy, type ReactNode } from "react";
import { SlotsmithProvider } from "slotsmith/provider";
import type { Lang } from "@/i18n";

/** The Arabic pack, loaded only on Arabic pages. */
const Arabic = lazy(async () => {
  const { ar } = await import("slotsmith/locales/ar");
  const packs = [ar];
  return {
    default: ({ children }: { children: ReactNode }) => (
      <SlotsmithProvider locale="ar" locales={packs}>
        {children}
      </SlotsmithProvider>
    ),
  };
});

/** Every pack the library ships, loaded only by the demos that ask for them. */
const AllLocales = lazy(async () => {
  const { ALL_LOCALES } = await import("./all-locales");
  return {
    default: ({ lang, children }: { lang: Lang; children: ReactNode }) => (
      <SlotsmithProvider locale={lang === "ar" ? "ar" : "en-US"} locales={ALL_LOCALES}>
        {children}
      </SlotsmithProvider>
    ),
  };
});

export interface SiteLocaleProps {
  lang: Lang;
  /** The packs a demo may switch between: the site's languages (default) or every pack the library ships. */
  locales?: "site" | "all";
  children: ReactNode;
}

export default function SiteLocale({ lang, locales = "site", children }: SiteLocaleProps) {
  if (locales === "all") return <AllLocales lang={lang}>{children}</AllLocales>;
  if (lang === "ar") return <Arabic>{children}</Arabic>;
  return <SlotsmithProvider locale="en-US">{children}</SlotsmithProvider>;
}
