/**
 * SwapDemo
 *
 * The landing's swap demo: one table, four design systems, and a segmented
 * control that switches between them. Only the `components` prop differs
 * between the four samples; the providers (MUI theme, Chakra system, the
 * shadcn scope) are applied here, never in a sample.
 *
 * The Fallback sample is imported statically, so it is in the prerendered
 * HTML. The other three load on demand: prefetched on hover, focus or touch
 * of their segment, and loaded on selection. Selection is a small state
 * machine: `current` is shown, `requested` is the latest choice, and a load
 * that finishes is shown only if it is still the latest choice, so rapid
 * clicks end on the last one with no flash of an earlier one. A failed load
 * keeps `current` on screen and offers a retry inside the demo box; when the
 * retry fails too (browsers keep a failed chunk's dependencies failed until
 * the page reloads), it offers a reload.
 *
 * Every switch fires `swap:before` and `swap:after` on the root, so
 * `landing-motion.ts` can play its explode, swap and reassemble around it
 * without this island importing the motion library.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import Fallback from "@samples/landing/swap-fallback";
import ExplodedView from "@/islands/ExplodedView";
import SiteLocale from "@/islands/SiteLocale";
import type { Lang } from "@/i18n";
import { diffLines } from "@/lib/diff";
import { nextTabIndex } from "@/lib/demo";
import type { ExplodePart } from "@/lib/explode";
import type { SwapMessages } from "@/lib/swap-messages";

export type Variant = "fallback" | "shadcn" | "mui" | "chakra";
type Remote = Exclude<Variant, "fallback">;

/** What a variant's provider reads: the site's theme and the page's direction. */
export interface VariantSettings {
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
}

const Settings = createContext<VariantSettings>({ theme: "dark", dir: "ltr" });

type VariantModule = { default: ComponentType };
export type VariantLoader = () => Promise<VariantModule>;

export const VARIANTS: readonly Variant[] = ["fallback", "shadcn", "mui", "chakra"];

type ProviderComponent = ComponentType<VariantSettings & { children: ReactNode }>;

/**
 * A dynamic import that can be tried again. Browsers remember a failed module
 * fetch for the life of the page, so importing the same URL again fails
 * without touching the network; the retry imports the URL the error names
 * under a fresh query instead.
 */
export function retryable<T>(load: () => Promise<T>): () => Promise<T> {
  let failed: string | undefined;
  let attempt = 0;
  return async () => {
    try {
      return failed ? ((await import(/* @vite-ignore */ `${failed}?retry=${++attempt}`)) as T) : await load();
    } catch (error) {
      failed = /https?:\/\/[^\s?#"']+\.js/.exec(String((error as Error | undefined)?.message))?.[0] ?? failed;
      throw error;
    }
  };
}

/** Loads a variant's sample and its provider together, wrapped so the provider reads the theme and direction. */
async function withProvider(sample: () => Promise<{ default: ComponentType }>, provider: () => Promise<ProviderComponent>): Promise<VariantModule> {
  const [{ default: Sample }, Provider] = await Promise.all([sample(), provider()]);
  return {
    default: function WithProvider() {
      const { theme, dir } = useContext(Settings);
      return (
        <Provider theme={theme} dir={dir}>
          <Sample />
        </Provider>
      );
    },
  };
}

/** One chunk set per design system: choosing shadcn never loads MUI or Chakra (`adapters/providers` gathers the same three). */
const SAMPLES = {
  shadcn: retryable(() => import("@samples/landing/swap-shadcn")),
  mui: retryable(() => import("@samples/landing/swap-mui")),
  chakra: retryable(() => import("@samples/landing/swap-chakra")),
};
const PROVIDER_MODULES = {
  shadcn: retryable(() => import("@samples/adapters/provider-shadcn")),
  mui: retryable(() => import("@samples/adapters/provider-mui")),
  chakra: retryable(() => import("@samples/adapters/provider-chakra")),
};
const DEFAULT_LOADERS: Record<Remote, VariantLoader> = {
  shadcn: () => withProvider(SAMPLES.shadcn, () => PROVIDER_MODULES.shadcn().then((m) => m.ShadcnProvider)),
  mui: () => withProvider(SAMPLES.mui, () => PROVIDER_MODULES.mui().then((m) => m.MuiProvider)),
  chakra: () => withProvider(SAMPLES.chakra, () => PROVIDER_MODULES.chakra().then((m) => m.ChakraUiProvider)),
};

export interface SwapDemoProps {
  lang: Lang;
  /** The UI text, from `swapMessages(lang)` (kept out of the island's bundle). */
  messages: SwapMessages;
  /** Each variant's sample source, shown in the code panel. */
  sources: Record<Variant, string>;
  /** Replaces the bundle loaders (tests inject their own). */
  loaders?: Partial<Record<Remote, () => Promise<{ default: ComponentType }>>>;
  /** The parts the exploded view labels. */
  parts?: ExplodePart[];
  /** The static figure's caption. */
  caption?: ReactNode;
  /**
   * Prerendered code panes, one `.swap__pane[data-code=<variant>]` each
   * (Swap.astro highlights them at build time). Without them the panel shows
   * `sources` as plain text.
   */
  children?: ReactNode;
}

const NAMES: Record<Remote, string> = { shadcn: "shadcn", mui: "MUI", chakra: "Chakra" };

function segmentLabel(lang: Lang, messages: SwapMessages, variant: Variant): ReactNode {
  if (variant === "fallback") return messages.fallback;
  return lang === "en" ? NAMES[variant] : <span lang="en">{NAMES[variant]}</span>;
}

const variantName = (messages: SwapMessages, variant: Variant) => (variant === "fallback" ? messages.fallback : NAMES[variant]);
const fill = (message: string, name: string) => message.replace("{name}", name);

/** The site theme, read from `<html data-theme>` and followed as it changes. */
function useSiteTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setTheme(html.dataset.theme === "light" ? "light" : "dark");
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** The code panel's fallback when no prerendered panes are passed: plain lines, changed ones marked. */
function PlainPanes({ messages, sources }: { messages: SwapMessages; sources: Record<Variant, string> }) {
  return VARIANTS.map((variant) => {
    const added = new Set(variant === "fallback" ? [] : diffLines(sources.fallback, sources[variant]).added);
    return (
      <div key={variant} className="swap__pane" data-code={variant}>
        <pre dir="ltr">
          <code>
            {sources[variant].split("\n").map((line, index) => (
              <span key={index}>
                <span className={added.has(index + 1) ? "line swap__line--added" : "line"}>
                  {line}
                  {added.has(index + 1) && <span className="visually-hidden"> {messages.changedLine}</span>}
                </span>
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
    );
  });
}

export default function SwapDemo({ lang, messages, sources, loaders, parts = [], caption, children }: SwapDemoProps) {
  const dir: VariantSettings["dir"] = lang === "ar" ? "rtl" : "ltr";
  const theme = useSiteTheme();
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<Variant>("fallback");
  const [requested, setRequested] = useState<Variant>("fallback");
  const [failed, setFailed] = useState<{ variant: Variant; retried: boolean } | null>(null);
  const latest = useRef<Variant>("fallback");
  const shown = useRef<Variant>("fallback");
  const loaded = useRef<Partial<Record<Variant, ComponentType>>>({ fallback: Fallback });
  const pending = useRef(new Map<Variant, Promise<ComponentType>>());
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  /** Starts (or reuses) a variant's load. A failed load is forgotten, so the next try loads again. */
  const load = (variant: Variant): Promise<ComponentType> => {
    const known = loaded.current[variant];
    if (known) return Promise.resolve(known);
    let promise = pending.current.get(variant);
    if (!promise) {
      const loader = loaders?.[variant as Remote] ?? DEFAULT_LOADERS[variant as Remote];
      promise = loader().then((module) => {
        loaded.current[variant] = module.default;
        return module.default;
      });
      promise.catch(() => pending.current.delete(variant));
      pending.current.set(variant, promise);
    }
    return promise;
  };

  const prefetch = (variant: Variant) => {
    load(variant).catch(() => {});
  };

  const show = (variant: Variant) => {
    if (shown.current === variant) return;
    root.current?.dispatchEvent(new CustomEvent("swap:before", { detail: { from: shown.current, to: variant } }));
    shown.current = variant;
    setCurrent(variant);
  };

  const select = (variant: Variant, retry = false) => {
    latest.current = variant;
    setRequested(variant);
    setFailed(null);
    if (loaded.current[variant]) {
      show(variant);
      return;
    }
    load(variant).then(
      () => {
        if (latest.current === variant) show(variant);
      },
      () => {
        if (latest.current !== variant) return;
        // Back to what is on screen; the notice offers the failed choice again.
        latest.current = shown.current;
        setRequested(shown.current);
        setFailed({ variant, retried: retry });
      },
    );
  };

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    root.current?.dispatchEvent(new CustomEvent("swap:after", { detail: { to: current } }));
  }, [current]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? "rtl" : "ltr";
    const next = nextTabIndex(index, VARIANTS.length, event.key, direction);
    if (next === undefined) return;
    event.preventDefault();
    select(VARIANTS[next]!);
    radios.current[next]?.focus();
  };

  const Current = loaded.current[current] ?? Fallback;
  const settings = useMemo(() => ({ theme, dir }), [theme, dir]);
  const loading = requested !== current;

  return (
    <div className="swap" ref={root} data-current={current} data-loading={loading || undefined} dir={dir}>
      <div className="swap__control" role="radiogroup" aria-label={messages.label}>
        {VARIANTS.map((variant, index) => (
          <button
            key={variant}
            ref={(element) => {
              radios.current[index] = element;
            }}
            type="button"
            role="radio"
            className="swap__segment"
            aria-checked={requested === variant}
            data-pending={(requested === variant && loading) || undefined}
            tabIndex={requested === variant ? 0 : -1}
            onClick={() => select(variant)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPointerEnter={() => prefetch(variant)}
            onFocus={() => prefetch(variant)}
            onTouchStart={() => prefetch(variant)}
          >
            {segmentLabel(lang, messages, variant)}
          </button>
        ))}
      </div>
      <ExplodedView parts={parts} caption={caption}>
        <div className="swap__frame">
          <div className="swap__box" aria-busy={loading || undefined}>
            <SiteLocale lang={lang}>
              <div className="sample-stage" dir={dir}>
                <Settings.Provider value={settings}>
                  <Current />
                </Settings.Provider>
              </div>
            </SiteLocale>
          </div>
          <div className="swap__notice" role="status" data-tone={failed ? "error" : undefined}>
            {failed ? (
              <>
                <span>{failed.retried ? messages.reload : messages.failed}</span>
                {failed.retried ? (
                  <button type="button" className="swap__retry" onClick={() => location.reload()}>
                    {messages.reloadButton}
                  </button>
                ) : (
                  <button type="button" className="swap__retry" onClick={() => select(failed.variant, true)}>
                    {messages.retry}
                  </button>
                )}
              </>
            ) : loading ? (
              <span>{fill(messages.loading, variantName(messages, requested))}</span>
            ) : null}
          </div>
        </div>
      </ExplodedView>
      <div className="swap__code" role="group" aria-label={fill(messages.code, variantName(messages, current))}>
        <p className="swap__file" dir="ltr">{`landing/swap-${current}.tsx`}</p>
        {children ?? <PlainPanes messages={messages} sources={sources} />}
      </div>
    </div>
  );
}
