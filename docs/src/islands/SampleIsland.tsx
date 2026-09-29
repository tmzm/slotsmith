/**
 * SampleIsland
 *
 * The one React island every demo goes through. It loads a sample from
 * `docs/samples/` by name, so each page ships only the samples it shows, and
 * wraps it in the language of the page.
 *
 * On the server the lazy sample suspends the whole render until it loads (no
 * Suspense boundary here on purpose), so the prerendered HTML holds the full
 * demo, not a fallback. On the client, hydration waits for the same chunk and
 * keeps the server HTML in place meanwhile.
 */
import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import type { Lang } from "@/i18n";

export interface SampleIslandProps {
  /** The sample's path under `samples/` without extension (`data-table/quick-start`). */
  name: string;
  lang: Lang;
  /** The packs a demo may switch between: the site's languages (default) or every pack the library ships. */
  locales?: "site" | "all";
}

type SampleModule = { default: ComponentType };

const loaders = import.meta.glob<SampleModule>("../../samples/**/*.tsx");

const SITE_LOCALES = [ar];

const samples = new Map<string, LazyExoticComponent<ComponentType>>();

/** One lazy component per sample, kept so React sees the same type on every render. */
function lazySample(name: string): LazyExoticComponent<ComponentType> {
  let sample = samples.get(name);
  if (!sample) {
    const load = loaders[`../../samples/${name}.tsx`];
    if (!load) throw new Error(`Unknown sample "${name}". Samples live in docs/samples/<area>/<name>.tsx.`);
    sample = lazy(load);
    samples.set(name, sample);
  }
  return sample;
}

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

/**
 * Looks the sample up while rendering, not in SampleIsland itself: Astro calls
 * the island's function once to detect its renderer and swallows what it
 * throws, so the error must come from a child to reach the build.
 */
function Sample({ name }: { name: string }) {
  const Component = lazySample(name);
  return <Component />;
}

export default function SampleIsland({ name, lang, locales = "site" }: SampleIslandProps) {
  const stage = (
    <div className="sample-stage" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Sample name={name} />
    </div>
  );
  if (locales === "all") return <AllLocales lang={lang}>{stage}</AllLocales>;
  return (
    <SlotsmithProvider locale={lang === "ar" ? "ar" : "en-US"} locales={SITE_LOCALES}>
      {stage}
    </SlotsmithProvider>
  );
}
