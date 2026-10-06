/**
 * SwapDemo
 *
 * The landing's swap demo: one table, five ways to dress it, and a segmented
 * control that switches between them. Only the `components` prop differs
 * between the samples; the providers (MUI theme, Chakra system, Ant Design's
 * `ConfigProvider`, the shadcn scope) are applied here, never in a sample.
 *
 * The Fallback sample is imported statically, so it is in the prerendered
 * HTML. The others load on demand: prefetched on hover, focus or touch
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
 * without this island importing the motion library. A `swap:before`
 * listener may hold the switch by passing a promise to `detail.waitUntil`
 * (while the event is dispatching); the switch happens when every such
 * promise settles, or after {@link SWAP_WAIT_MAX} ms, whichever comes first.
 * A later choice made while it waits replaces it.
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

export type Variant = "fallback" | "shadcn" | "mui" | "chakra" | "antd";
type Remote = Exclude<Variant, "fallback">;

/** What a variant's provider reads: the site's theme and the page's direction and language. */
export interface VariantSettings {
  theme: "dark" | "light";
  dir: "ltr" | "rtl";
  /** The page's language, for a design system's own labels (MUI's "Rows per page"). */
  lang: Lang;
}

const Settings = createContext<VariantSettings>({ theme: "dark", dir: "ltr", lang: "en" });

type VariantModule = { default: ComponentType };
export type VariantLoader = () => Promise<VariantModule>;

export const VARIANTS: readonly Variant[] = ["fallback", "shadcn", "mui", "chakra", "antd"];

/** The longest a `swap:before` listener can hold a switch, in ms (DESIGN.md: explode, swap and reassemble in 700ms at most). */
export const SWAP_WAIT_MAX = 700;

/** The `detail` of the `swap:before` event. */
export interface SwapBeforeDetail {
  from: Variant;
  to: Variant;
  /** Holds the switch until `promise` settles (at most {@link SWAP_WAIT_MAX} ms). Call it while the event is dispatching. */
  waitUntil(promise: Promise<unknown>): void;
}

/** The `detail` of the `swap:after` event. */
export interface SwapAfterDetail {
  to: Variant;
}

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

/** Loads a variant's sample and its provider together, wrapped so the provider reads the theme, direction and language. */
export async function withProvider(sample: () => Promise<{ default: ComponentType }>, provider: () => Promise<ProviderComponent>): Promise<VariantModule> {
  const [{ default: Sample }, Provider] = await Promise.all([sample(), provider()]);
  return {
    default: function WithProvider() {
      const { theme, dir, lang } = useContext(Settings);
      return (
        <Provider theme={theme} dir={dir} lang={lang}>
          <Sample />
        </Provider>
      );
    },
  };
}

/** One chunk set per design system: choosing shadcn never loads MUI, Chakra or Ant Design (`adapters/providers` gathers the same four). */
const SAMPLES = {
  shadcn: retryable(() => import("@samples/landing/swap-shadcn")),
  mui: retryable(() => import("@samples/landing/swap-mui")),
  chakra: retryable(() => import("@samples/landing/swap-chakra")),
  antd: retryable(() => import("@samples/landing/swap-antd")),
};
const PROVIDER_MODULES = {
  shadcn: retryable(() => import("@samples/adapters/provider-shadcn")),
  mui: retryable(() => import("@samples/adapters/provider-mui")),
  chakra: retryable(() => import("@samples/adapters/provider-chakra")),
  antd: retryable(() => import("@samples/adapters/provider-antd")),
};
const DEFAULT_LOADERS: Record<Remote, VariantLoader> = {
  shadcn: () =>
    withProvider(SAMPLES.shadcn, async () => {
      const m = await PROVIDER_MODULES.shadcn();
      await m.loadShadcnStyles();
      return m.ShadcnProvider;
    }),
  mui: () => withProvider(SAMPLES.mui, () => PROVIDER_MODULES.mui().then((m) => m.MuiProvider)),
  chakra: () => withProvider(SAMPLES.chakra, () => PROVIDER_MODULES.chakra().then((m) => m.ChakraUiProvider)),
  antd: () => withProvider(SAMPLES.antd, () => PROVIDER_MODULES.antd().then((m) => m.AntdProvider)),
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

const NAMES: Record<Remote, string> = { shadcn: "shadcn", mui: "MUI", chakra: "Chakra", antd: "Ant Design" };

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
    const holds: Promise<unknown>[] = [];
    let dispatching = true;
    const detail: SwapBeforeDetail = {
      from: shown.current,
      to: variant,
      waitUntil: (promise) => {
        if (dispatching) holds.push(promise);
      },
    };
    root.current?.dispatchEvent(new CustomEvent<SwapBeforeDetail>("swap:before", { detail }));
    dispatching = false;
    const commit = () => {
      // A later choice made while this one waited has taken over.
      if (latest.current !== variant || shown.current === variant) return;
      shown.current = variant;
      setCurrent(variant);
    };
    if (holds.length === 0) {
      commit();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cap = new Promise<void>((done) => {
      timer = setTimeout(done, SWAP_WAIT_MAX);
    });
    void Promise.race([Promise.allSettled(holds), cap]).then(() => {
      clearTimeout(timer);
      commit();
    });
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
    root.current?.dispatchEvent(new CustomEvent<SwapAfterDetail>("swap:after", { detail: { to: current } }));
  }, [current]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? "rtl" : "ltr";
    // Up and Down go to the previous and next choice in any direction (WAI-ARIA radio group).
    const vertical = { ArrowUp: VARIANTS.length - 1, ArrowDown: 1 }[event.key];
    const next = vertical === undefined ? nextTabIndex(index, VARIANTS.length, event.key, direction) : (index + vertical) % VARIANTS.length;
    if (next === undefined) return;
    event.preventDefault();
    select(VARIANTS[next]!);
    radios.current[next]?.focus();
  };

  const Current = loaded.current[current] ?? Fallback;
  const settings = useMemo(() => ({ theme, dir, lang }), [theme, dir, lang]);
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
          <div className="swap__box" data-explode-bounds="" aria-busy={loading || undefined}>
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
        <div className="swap__panes">{children ?? <PlainPanes messages={messages} sources={sources} />}</div>
      </div>
    </div>
  );
}
