/**
 * SwapDemo
 *
 * The landing's swap demo: one table, five ways to dress it, and a segmented
 * control that switches between them, with the whole table (five rows and its
 * pagination) beside its code on wide screens and above it on narrow ones.
 * Only the `components` prop differs between the samples; the providers (MUI
 * theme, Chakra system, Ant Design's `ConfigProvider`, the shadcn scope) are
 * applied here, never in a sample.
 *
 * The Fallback sample is imported statically, so it is in the prerendered
 * HTML. The others load on demand: prefetched on hover, focus or touch
 * of their segment, and loaded on selection. Selection is a small state
 * machine: `current` is shown, `requested` is the latest choice, and a load
 * that finishes is shown only if it is still the latest choice, so rapid
 * clicks end on the last one with no flash of an earlier one. A failed load
 * keeps `current` on screen and offers a retry inside the demo frame; when the
 * retry fails too (browsers keep a failed chunk's dependencies failed until
 * the page reloads), it offers a reload.
 *
 * A switch fades the table out (90ms), swaps it, and fades the new one in
 * while its rows and pagination lift into place one after another: under half
 * a second, with the Web Animations API, and instant under reduced motion.
 * "Show parts" opens the table along its parts and labels each one
 * (`ExplodedView`, with the parts found by `lib/swap-parts` in every variant).
 */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import Fallback from "@samples/landing/swap-fallback";
import ExplodedView from "@/islands/ExplodedView";
import SiteLocale from "@/islands/SiteLocale";
import type { Lang } from "@/i18n";
import { diffLines } from "@/lib/diff";
import { nextTabIndex } from "@/lib/demo";
import type { ExplodePart } from "@/lib/explode";
import { locateSwapPart } from "@/lib/swap-parts";
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
  /** The parts "Show parts" labels. */
  parts?: ExplodePart[];
  /** What the brackets mean, shown under the table while its parts are. */
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

const NO_PARTS: ExplodePart[] = [];

/** The old table's fade, in ms. */
const FADE_OUT = 90;
/** The new table's fade, in ms. */
const FADE_IN = 200;
/** One row's lift into place, and the delay between one row and the next, in ms. Seven rise: 90 + 240 + 6 × 20 = 450ms in all. */
const LIFT = 240;
const LIFT_STAGGER = 20;
/** How long the parts take to open or close (`--explode`'s transition in explode.css), in ms. */
const PARTS_MOVE = 320;
/** `--ease-out` from docs/DESIGN.md section 2. */
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const animates = (element: HTMLElement | null): element is HTMLElement => !!element && typeof element.animate === "function" && !reducedMotion();

/**
 * Marks the pagination widget's root with `.swap__pagination`, which
 * explode.css keeps in view while a wide table scrolls sideways. A class, not
 * a data attribute: the site's verifier reads every data attribute on a part
 * as one the library sets.
 */
function markPagination(stage: HTMLElement) {
  const [root] = locateSwapPart(stage, { slot: "Pagination" });
  for (const marked of stage.querySelectorAll(".swap__pagination")) if (marked !== root) marked.classList.remove("swap__pagination");
  if (root && !root.classList.contains("swap__pagination")) root.classList.add("swap__pagination");
}

export default function SwapDemo({ lang, messages, sources, loaders, parts = NO_PARTS, caption, children }: SwapDemoProps) {
  const dir: VariantSettings["dir"] = lang === "ar" ? "rtl" : "ltr";
  const theme = useSiteTheme();
  const [current, setCurrent] = useState<Variant>("fallback");
  const [requested, setRequested] = useState<Variant>("fallback");
  const [failed, setFailed] = useState<{ variant: Variant; retried: boolean } | null>(null);
  const latest = useRef<Variant>("fallback");
  const shown = useRef<Variant>("fallback");
  const loaded = useRef<Partial<Record<Variant, ComponentType>>>({ fallback: Fallback });
  const pending = useRef(new Map<Variant, Promise<ComponentType>>());
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fadeOut = useRef<Animation | undefined>(undefined);

  // Show parts: `open` drives `--explode`; `room` grows the frame before the
  // parts open and shrinks it after they close; `labels` shows the labels once
  // they are placed; `used` hands the parts to the view on first use only.
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(false);
  const [labels, setLabels] = useState(false);
  const [placed, setPlaced] = useState(0);
  const [used, setUsed] = useState(false);
  const partsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isOpen = useRef(false);
  isOpen.current = open;

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

  /** Shows a loaded variant: fades the table out, then swaps it, unless a later choice took over meanwhile. */
  const show = (variant: Variant) => {
    if (shown.current === variant) return;
    const commit = () => {
      if (latest.current !== variant || shown.current === variant) return;
      shown.current = variant;
      setCurrent(variant);
    };
    const element = stage.current;
    if (!animates(element)) {
      commit();
      return;
    }
    setLabels(false);
    const from = getComputedStyle(element).opacity;
    fadeOut.current?.cancel();
    const fade = element.animate([{ opacity: from }, { opacity: 0 }], { duration: FADE_OUT, easing: "ease-in", fill: "forwards" });
    fadeOut.current = fade;
    fade.finished.then(commit, commit);
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

  /** The parts have stopped moving: place the labels again and show them if the parts are shown. */
  const settle = () => {
    setPlaced((count) => count + 1);
    if (isOpen.current) setLabels(true);
  };

  // Before the new table is first painted: it fades in, and its rows and pagination lift into place.
  const first = useRef(true);
  useLayoutEffect(() => {
    const element = stage.current;
    if (element) markPagination(element);
    if (first.current) {
      first.current = false;
      return;
    }
    fadeOut.current?.cancel();
    fadeOut.current = undefined;
    if (!animates(element)) {
      settle();
      return;
    }
    element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN, easing: EASE_OUT });
    const rising = [...element.querySelectorAll<HTMLElement>("thead tr, tbody tr"), ...locateSwapPart(element, { slot: "Pagination" })];
    // `translate`, not `transform`: it adds to the parts' own offsets while they are shown.
    const lifts = rising.map((part, index) =>
      part.animate([{ translate: "0 0.5rem", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: LIFT, delay: index * LIFT_STAGGER, easing: EASE_OUT, fill: "backwards" }),
    );
    let live = true;
    Promise.all(lifts.map((lift) => lift.finished)).then(
      () => live && settle(),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [current]);

  // A page change or a sort can render a new pagination, or reset its classes: keep it marked.
  useEffect(() => {
    const element = scroller.current;
    if (!element || typeof MutationObserver === "undefined") return;
    markPagination(element);
    const observer = new MutationObserver(() => markPagination(element));
    observer.observe(element, { childList: true, subtree: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // The frame's edge fades on the side the table scrolls toward.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      const travel = element.scrollWidth - element.clientWidth;
      const at = Math.abs(element.scrollLeft);
      const start = at > 1;
      const end = at < travel - 1;
      const more = start && end ? "both" : start ? "start" : end ? "end" : undefined;
      if (more) element.dataset.more = more;
      else delete element.dataset.more;
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    resize?.observe(element);
    if (element.firstElementChild) resize?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", update);
      resize?.disconnect();
    };
  }, []);

  useEffect(() => () => clearTimeout(partsTimer.current), []);

  const toggleParts = () => {
    clearTimeout(partsTimer.current);
    const wait = reducedMotion() ? 0 : PARTS_MOVE;
    setLabels(false);
    if (!open) {
      setUsed(true);
      setRoom(true);
      setOpen(true);
      partsTimer.current = setTimeout(settle, wait);
    } else {
      setOpen(false);
      partsTimer.current = setTimeout(() => setRoom(false), wait);
    }
  };

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
    <div className="swap" data-current={current} data-loading={loading || undefined} dir={dir}>
      <div className="swap__bar">
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
        <button type="button" className="swap__parts" aria-pressed={open} onClick={toggleParts}>
          <span className="swap__switch" aria-hidden="true" />
          {messages.parts}
        </button>
      </div>
      <div className="swap__layout">
        <div className="swap__table">
          <div className="swap__frame" data-room={room || undefined} data-open={open || undefined} data-labels={labels || undefined}>
            <div className="swap__scroll" ref={scroller} data-explode-bounds="" aria-busy={loading || undefined}>
              <ExplodedView parts={used ? parts : NO_PARTS} locate={locateSwapPart} measureKey={`${current}:${placed}`}>
                <SiteLocale lang={lang}>
                  <div className="sample-stage" dir={dir} ref={stage}>
                    <Settings.Provider value={settings}>
                      <Current />
                    </Settings.Provider>
                  </div>
                </SiteLocale>
              </ExplodedView>
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
          {open && caption && <p className="swap__legend">{caption}</p>}
        </div>
        <div className="swap__code" role="group" aria-label={fill(messages.code, variantName(messages, current))}>
          <p className="swap__file" dir="ltr">{`landing/swap-${current}.tsx`}</p>
          <div className="swap__panes">{children ?? <PlainPanes messages={messages} sources={sources} />}</div>
        </div>
      </div>
    </div>
  );
}
