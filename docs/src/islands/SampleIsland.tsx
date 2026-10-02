/**
 * SampleIsland
 *
 * The one React island every demo goes through. It loads a sample from
 * `docs/samples/` by name, so each page ships only the samples it shows, and
 * wraps it in the language of the page (SiteLocale).
 *
 * On the server the lazy sample suspends the whole render until it loads (no
 * Suspense boundary here on purpose), so the prerendered HTML holds the full
 * demo, not a fallback. On the client, hydration waits for the same chunk and
 * keeps the server HTML in place meanwhile.
 *
 * With `provider`, the sample renders inside that design system's provider
 * (the adapter demos). Each provider is its own dynamic import, loaded with
 * its stylesheet before the sample shows, so a page loads only the design
 * systems it shows. The provider follows the site theme (`<html
 * data-theme>`) as it changes; it reads it on first render, so such a demo
 * renders on the client only (`Demo` hydrates it with `client:only`).
 */
import { lazy, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import SiteLocale from "@/islands/SiteLocale";
import type { Lang } from "@/i18n";
import type { ProviderName, ProviderProps } from "@samples/adapters/providers";

export interface SampleIslandProps {
  /** The sample's path under `samples/` without extension (`data-table/quick-start`). */
  name: string;
  lang: Lang;
  /** The packs a demo may switch between: the site's languages (default) or every pack the library ships. */
  locales?: "site" | "all";
  /** Wraps the sample in this design system's provider (the adapter demos). Client-only. */
  provider?: ProviderName;
}

type SampleModule = { default: ComponentType };

const loaders = import.meta.glob<SampleModule>(["../../samples/**/*.tsx", "!../../samples/**/__tests__/**"]);

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

/**
 * Looks the sample up while rendering, not in SampleIsland itself: Astro calls
 * the island's function once to detect its renderer and swallows what it
 * throws, so the error must come from a child to reach the build.
 */
function Sample({ name }: { name: string }) {
  const Component = lazySample(name);
  return <Component />;
}

type ProviderComponent = ComponentType<ProviderProps>;

/** One dynamic import per design system, each resolving once its stylesheet (if any) has loaded. */
const PROVIDER_LOADERS: Record<ProviderName, () => Promise<ProviderComponent>> = {
  shadcn: () =>
    import("@samples/adapters/provider-shadcn").then(async (m) => {
      await m.loadShadcnStyles();
      return m.ShadcnProvider;
    }),
  mui: () => import("@samples/adapters/provider-mui").then((m) => m.MuiProvider),
  chakra: () => import("@samples/adapters/provider-chakra").then((m) => m.ChakraUiProvider),
  antd: () => import("@samples/adapters/provider-antd").then((m) => m.AntdProvider),
  radix: () =>
    import("@samples/adapters/provider-radix").then(async (m) => {
      await m.loadRadixStyles();
      return m.RadixProvider;
    }),
};

const readTheme = (): "dark" | "light" =>
  typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark";

/** The site theme, read from `<html data-theme>` and followed as it changes. */
function useSiteTheme(): "dark" | "light" {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    setTheme(readTheme());
    return () => observer.disconnect();
  }, []);
  return theme;
}

type Wrapper = ComponentType<{ children: ReactNode; dir: "ltr" | "rtl" }>;

const providers = new Map<ProviderName, LazyExoticComponent<Wrapper>>();

/** One lazy wrapper per design system: its provider, fed the site theme and the page direction. */
function lazyProvider(name: ProviderName): LazyExoticComponent<Wrapper> {
  let wrapper = providers.get(name);
  if (!wrapper) {
    wrapper = lazy(async () => {
      const Provider = await PROVIDER_LOADERS[name]();
      return {
        default: function WithProvider({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
          const theme = useSiteTheme();
          return (
            <Provider theme={theme} dir={dir}>
              {children}
            </Provider>
          );
        },
      };
    });
    providers.set(name, wrapper);
  }
  return wrapper;
}

/** Like `Sample`, the lookup happens while rendering so an unknown provider fails loudly. */
function WithProvider({ provider, dir, children }: { provider: ProviderName; dir: "ltr" | "rtl"; children: ReactNode }) {
  if (!PROVIDER_LOADERS[provider]) throw new Error(`Unknown provider "${provider}". Expected one of: ${Object.keys(PROVIDER_LOADERS).join(", ")}.`);
  const Wrap = lazyProvider(provider);
  return <Wrap dir={dir}>{children}</Wrap>;
}

export default function SampleIsland({ name, lang, locales = "site", provider }: SampleIslandProps) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const sample = <Sample name={name} />;
  return (
    <SiteLocale lang={lang} locales={locales}>
      <div className="sample-stage" dir={dir}>
        {provider ? (
          <WithProvider provider={provider} dir={dir}>
            {sample}
          </WithProvider>
        ) : (
          sample
        )}
      </div>
    </SiteLocale>
  );
}
