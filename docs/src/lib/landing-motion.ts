/**
 * Landing motion (docs/DESIGN.md sections 6 and 7)
 *
 * The landing's choreography. `MotionLoader.astro` imports this module with
 * `import()` after `load`, and only when `prefers-reduced-motion` is not
 * `reduce`, so none of it is in the landing's initial JavaScript. The page is
 * complete without it: every panel is visible in the HTML and every control
 * works before and without this module.
 *
 * Two parts:
 * - The first-load wave, with the Web Animations API (no library).
 * - The GSAP work (pinned exploded view, the switch's mini explode, the
 *   languages sweep) in {@link runGsap}, the only place GSAP is imported.
 *
 * Only transform, clip-path and the border colour flash are animated, and
 * every directional motion mirrors under `dir="rtl"`.
 */
import { waveOrder } from "@/lib/wave";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

/** Options for {@link startLandingMotion}. */
export interface LandingMotionOptions {
  /** The reader asked for reduced motion: start nothing. */
  reducedMotion: boolean;
  /** The page reads right to left: mirror directional motion. */
  rtl: boolean;
}

/** The `sessionStorage` key that marks the first-load wave as played. */
export const WAVE_SESSION_KEY = "slotsmith-boot";

/** One panel's rise, in ms. */
const WAVE_DURATION = 620;
/** Delay between one panel and the next in the wave, in ms. */
const WAVE_STAGGER = 55;
/** How long the landed border stays gold before it fades back, in ms. */
const WAVE_FLASH_HOLD = 450;
/** The border's fade from gold back to its own colour, in ms. */
const WAVE_FLASH_FADE = 800;
/**
 * The wave is an entrance, so it plays only if `load` came soon after the
 * navigation started (ms since then). On a slow connection the reader has
 * been looking at the panels for a while by `load`; hiding them to raise them
 * again would be a flash, not an entrance.
 */
const WAVE_LATEST = 2000;
/** `--ease-out` from docs/DESIGN.md section 2. */
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** The pinned exploded view needs the side-by-side layout and a viewport that holds the control and the demo box under the header. */
const PIN_QUERY = "(min-width: 1024px) and (min-height: 660px) and (prefers-reduced-motion: no-preference)";
/**
 * The motion that needs no layout of its own. `gsap.matchMedia` undoes it when
 * the reader turns reduced motion on while the page is open.
 */
const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
/** A restored scroll position counts as settled when it and the page's height have not changed for this long (ms), or after {@link SETTLE_MOST}. */
const SETTLE = 400;
const SETTLE_MOST = 2500;
/** How far the switch's mini explode opens (`--explode`). */
const MINI_PEAK = 0.6;
/** The mini explode's opening, in seconds. */
const MINI_OUT = 0.24;
/** The mini explode's reassembly, in seconds. With `MINI_OUT` and `MINI_ORPHAN` it stays within 700ms. */
const MINI_BACK = 0.36;
/** How long an opened mini explode waits for its `swap:after` before it reassembles anyway, in ms. */
const MINI_ORPHAN = 100;
/** The languages demo's sweep, in seconds. */
const SWEEP = 0.28;

const noop = () => {};

/**
 * Starts the landing choreography.
 *
 * @param root - The landing's document.
 * @param opts - Reduced motion and reading direction, read by the caller from `matchMedia` and `<html dir>`.
 * @returns A cleanup that stops everything this call started. Under reduced motion it is a no-op, and GSAP is never imported.
 */
export async function startLandingMotion(root: Document, opts: LandingMotionOptions): Promise<() => void> {
  if (opts.reducedMotion) return noop;
  const cleanups = [playWave(root, opts.rtl)];
  try {
    cleanups.push(await runGsap(root));
  } catch {
    // The page is complete without motion: leave it in its static state.
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/**
 * The first-load wave, once per session (`sessionStorage["slotsmith-boot"]`):
 * the `[data-panel]` elements in the viewport rise out of a clip mask,
 * `inset(0 0 100% 0)` and 18px down, in {@link waveOrder}, 620ms each and
 * 55ms apart, their borders gold as they land and fading back after. The
 * panels are visible in the HTML; each animation applies its starting state
 * as it is created (`fill: "backwards"`), in the same frame, and ends on the
 * panel's own styles. Skipped when the page is already scrolled or `load`
 * came late (see `WAVE_LATEST`).
 *
 * @returns A cleanup that cancels the wave, which puts every panel back in its resting state.
 */
function playWave(root: Document, rtl: boolean): () => void {
  const view = root.defaultView;
  if (!view || view.scrollY > 0 || view.performance.now() > WAVE_LATEST) return noop;
  try {
    if (view.sessionStorage.getItem(WAVE_SESSION_KEY)) return noop;
  } catch {
    // Storage blocked: play it, it cannot be remembered.
  }

  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")]
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.bottom > 0 && rect.top < view.innerHeight);
  if (panels.length === 0) return noop;

  try {
    view.sessionStorage.setItem(WAVE_SESSION_KEY, "1");
  } catch {
    // As above.
  }

  const gold = view.getComputedStyle(root.documentElement).getPropertyValue("--gold").trim() || "#c9a14a";
  const flash = WAVE_FLASH_HOLD + WAVE_FLASH_FADE;
  const animations = waveOrder(
    panels.map(({ rect }) => rect),
    view.innerWidth,
    rtl,
  ).flatMap((index, step) => {
    const { element } = panels[index]!;
    const delay = step * WAVE_STAGGER;
    const border = view.getComputedStyle(element).borderTopColor;
    return [
      element.animate(
        [
          { clipPath: "inset(0 0 100% 0)", transform: "translateY(18px)" },
          { clipPath: "inset(0 0 0 0)", transform: "translateY(0)" },
        ],
        { duration: WAVE_DURATION, delay, easing: EASE_OUT, fill: "backwards" },
      ),
      element.animate(
        [
          { borderColor: gold, offset: 0 },
          { borderColor: gold, offset: WAVE_FLASH_HOLD / flash },
          { borderColor: border, offset: 1 },
        ],
        { duration: flash, delay, easing: "ease-out", fill: "backwards" },
      ),
    ];
  });
  return () => {
    for (const animation of animations) animation.cancel();
  };
}

/**
 * Resolves once a restored scroll position has settled. A reload or a back /
 * forward step makes the browser scroll to where the reader was as the page's
 * height grows into it, and ScrollTrigger measuring the page meanwhile scrolls
 * it back to the top and puts it where it is at that moment: the reader's place
 * is lost. So on those navigations nothing of GSAP is loaded until the scroll
 * position and the page's height have not changed for {@link SETTLE} ms (or
 * {@link SETTLE_MOST} ms have passed). A fresh visit does not wait.
 */
function restored(view: Window): Promise<void> {
  const entry = view.performance?.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (entry?.type !== "reload" && entry?.type !== "back_forward") return Promise.resolve();
  const body = view.document.body;
  return new Promise((resolve) => {
    const began = view.performance.now();
    let seen = "";
    let since = began;
    const check = () => {
      const now = view.performance.now();
      const state = `${view.scrollY}/${body.scrollHeight}`;
      if (state !== seen) {
        seen = state;
        since = now;
      }
      if (now - since >= SETTLE || now - began >= SETTLE_MOST) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

/**
 * The GSAP choreography (plan 02 Task 6, DESIGN.md sections 6 and 7). `gsap`
 * and `gsap/ScrollTrigger` are imported here with `import()` and nowhere
 * else, and only when the page has something for them to drive, so a page
 * without the landing's hooks never fetches them.
 *
 * - {@link explodedView}: the pinned exploded view and the switch's mini
 *   explode, on screens that match {@link PIN_QUERY}. Smaller screens keep the
 *   static state (the table beside the labelled diagram, an instant switch).
 * - {@link languagesSweep}: the languages demo's sweep, at every size.
 *
 * If anything fails, everything started so far is undone and the error goes
 * to the caller, which leaves the page static.
 *
 * @returns A cleanup that kills every tween, ScrollTrigger, observer and listener it made and puts `data-static` back.
 */
async function runGsap(root: Document): Promise<() => void> {
  const view = root.defaultView;
  const section = root.querySelector<HTMLElement>('[data-motion="swap"]');
  const languages = root.querySelector<HTMLElement>('[data-sample="landing/languages"]');
  if (!view || (!section && !languages)) return noop;

  await restored(view);
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);

  const cleanups: (() => void)[] = [];
  const cleanup = () => {
    for (const undo of cleanups.splice(0).reverse()) undo();
  };
  try {
    const media = gsap.matchMedia();
    cleanups.push(() => media.revert());
    if (section) media.add(PIN_QUERY, () => explodedView(gsap, ScrollTrigger, view, section));
    if (languages) media.add(MOTION_QUERY, () => languagesSweep(gsap, languages));
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}

/**
 * The exploded view (DESIGN.md section 6, item 2).
 *
 * **Pin.** The pin is set up at once, while `.explode` is still static: the
 * section is pinned for one viewport of scroll with the demo box centred under
 * the header, and `--explode` on `.explode` goes 0 → 1 → 0 with `scrub`. CSS
 * computes every transform and label opacity from it. The pin's spacer
 * reserves the scroll distance, and the page is measured again when its
 * height changes.
 *
 * **Taking over.** Removing `data-static` from `.explode` takes the static
 * figure off screen and gives the demo box room for the parts, which moves
 * the table. That happens once the island has hydrated (the floating labels
 * exist) and while the pin holds the view (`onEnter` / `onEnterBack`), so the
 * rest of the page does not move; if the reader has scrolled the view out of
 * sight by then (a restored scroll position), it happens there instead. The
 * figure stays in the accessibility tree afterwards (`styles/explode.css`).
 *
 * **Scroll.** While the pin holds the view and the view is open, `.explode`
 * carries `data-driven`: the demo box stops scrolling on its own, so the wheel
 * over it moves the page and the table explodes whole. It is released as soon
 * as the pin lets go or `--explode` is back at 0, and the box's scroll
 * position is never touched. Its controls still take clicks and focus.
 *
 * **Switch.** `swap:before` holds the island's switch (`detail.waitUntil`)
 * until `--explode` reaches {@link MINI_PEAK}; `swap:after` reassembles. A
 * `swap:before` that gets no `swap:after` (a later choice replaced it)
 * reassembles after {@link MINI_ORPHAN} ms. The scroll and the switch each
 * hold a value and `--explode` is the larger, so neither fights the other and
 * the demo stays usable while pinned.
 *
 * @returns A cleanup that restores the static state.
 */
function explodedView(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic, view: Window, section: HTMLElement): () => void {
  const explode = section.querySelector<HTMLElement>(".explode");
  const swap = section.querySelector<HTMLElement>(".swap");
  const frame = section.querySelector<HTMLElement>(".swap__frame");
  if (!explode || !swap || !frame || !explode.hasAttribute("data-static")) return noop;
  const root = section.ownerDocument;
  const control = swap.querySelector<HTMLElement>(".swap__control");
  const header = root.querySelector<HTMLElement>(".site-header");
  const island = swap.closest("astro-island");

  const state = { scroll: 0, mini: 0 };
  let live = false;
  let timeline: gsap.core.Timeline | undefined;
  let pin: ScrollTrigger | undefined;
  let mini: gsap.core.Tween | undefined;
  /** Lets the switch that `mini` is holding go. */
  let release: (() => void) | undefined;
  let reassembling = false;
  let orphan: ReturnType<typeof setTimeout> | undefined;
  let refresh: ReturnType<typeof setTimeout> | undefined;
  let height = 0;
  let sight: IntersectionObserver | undefined;
  let resize: ResizeObserver | undefined;

  /** The scroll has the view: the pin holds it and it is not back at rest. */
  const drive = () => {
    const open = Math.max(state.scroll, state.mini);
    explode.toggleAttribute("data-driven", live && !!pin?.isActive && !(pin.progress > 0.5 && open < 0.001));
  };
  const apply = () => {
    explode.style.setProperty("--explode", String(Math.round(Math.max(state.scroll, state.mini) * 1000) / 1000));
    drive();
  };

  /** Where the demo box's centre sits while pinned: mid-viewport under the header, lower when the control would slide under it. */
  const pinAt = () => {
    const top = header?.offsetHeight ?? 0;
    const above = control ? frame.getBoundingClientRect().top - control.getBoundingClientRect().top : 0;
    return Math.round(Math.max((view.innerHeight + top) / 2, top + 16 + above + frame.offsetHeight / 2));
  };

  const hydrated = () => !island?.hasAttribute("ssr");
  const isVisible = () => {
    const rect = explode.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < view.innerHeight;
  };

  /** Takes the static figure off screen. Undone, with everything else, by the cleanup. */
  const takeOver = () => {
    if (live || !hydrated()) return;
    live = true;
    explode.removeAttribute("data-static");
    drive();
    // The layout changed under the pin: measure again, outside this callback.
    clearTimeout(refresh);
    refresh = setTimeout(() => ScrollTrigger.refresh(), 0);
  };
  // Hydrated while the pin holds the view, or with the view out of sight.
  const whenHydrated = () => {
    if (pin?.isActive || !isVisible()) takeOver();
  };

  const reassemble = () => {
    clearTimeout(orphan);
    if (reassembling) return;
    reassembling = true;
    mini?.kill();
    // The way back takes the time the way out left over, so a switch stays within 700ms.
    mini = gsap.to(state, {
      mini: 0,
      duration: MINI_BACK * Math.min(1, state.mini / MINI_PEAK),
      ease: "power2.inOut",
      onUpdate: apply,
      onComplete: () => {
        reassembling = false;
      },
    });
  };
  const onBefore = (event: Event) => {
    const detail = (event as CustomEvent<{ waitUntil?: (promise: Promise<unknown>) => void } | undefined>).detail;
    if (!live || typeof detail?.waitUntil !== "function") return;
    clearTimeout(orphan);
    release?.();
    mini?.kill();
    reassembling = false;
    // Already open this far (mid-scroll, or a switch right after another): nothing to wait for.
    if (Math.max(state.scroll, state.mini) >= MINI_PEAK) {
      if (state.mini > 0) orphan = setTimeout(reassemble, MINI_ORPHAN);
      return;
    }
    detail.waitUntil(
      new Promise<void>((resolve) => {
        release = resolve;
        state.mini = Math.max(state.scroll, state.mini);
        mini = gsap.to(state, {
          mini: MINI_PEAK,
          duration: MINI_OUT,
          ease: "power2.out",
          onUpdate: apply,
          onComplete: () => {
            orphan = setTimeout(reassemble, MINI_ORPHAN);
            resolve();
          },
        });
      }),
    );
  };
  const onAfter = () => {
    if (live && state.mini > 0) reassemble();
  };

  const stop = () => {
    sight?.disconnect();
    resize?.disconnect();
    island?.removeEventListener("astro:hydrate", whenHydrated);
    swap.removeEventListener("swap:before", onBefore);
    swap.removeEventListener("swap:after", onAfter);
    clearTimeout(orphan);
    clearTimeout(refresh);
    release?.();
    mini?.kill();
    pin?.kill(true);
    timeline?.kill();
    explode.style.removeProperty("--explode");
    explode.removeAttribute("data-driven");
    explode.setAttribute("data-static", "");
    live = false;
  };

  try {
    timeline = gsap
      .timeline({
        defaults: { ease: "power1.inOut" },
        onUpdate: apply,
        scrollTrigger: {
          trigger: frame,
          pin: section,
          start: () => `center ${pinAt()}px`,
          end: () => `+=${view.innerHeight}`,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: takeOver,
          onEnterBack: takeOver,
          onToggle: drive,
          onRefresh: () => {
            height = root.body.scrollHeight;
          },
        },
      })
      .to(state, { scroll: 1, duration: 0.4 })
      .to(state, { scroll: 1, duration: 0.2 })
      .to(state, { scroll: 0, duration: 0.4 });
    pin = timeline.scrollTrigger;
    height = root.body.scrollHeight;

    // A reader who restores a scroll position past the pin never enters it: take over once the view is out of sight.
    sight = new IntersectionObserver(([entry]) => {
      if (!entry || entry.isIntersecting || live || !hydrated()) return;
      takeOver();
    });
    sight.observe(explode);
    if (!hydrated()) island?.addEventListener("astro:hydrate", whenHydrated, { once: true });

    // The page's height changing (fonts, an opened answer, a loaded demo) moves the pin's start.
    resize = new ResizeObserver(() => {
      if (root.body.scrollHeight === height) return;
      clearTimeout(refresh);
      refresh = setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    resize.observe(root.body);

    swap.addEventListener("swap:before", onBefore);
    swap.addEventListener("swap:after", onAfter);
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}

/**
 * The languages demo's sweep (DESIGN.md section 6, item 6): when the demo's
 * table changes direction, it is revealed again by a 280ms `clip-path` sweep
 * in the new reading direction, from the right edge for `rtl` and from the
 * left for `ltr`. A change of language that keeps the direction plays nothing.
 *
 * @returns A cleanup that stops watching and clears a sweep in flight.
 */
function languagesSweep(gsap: Gsap, demo: HTMLElement): () => void {
  let sweep: gsap.core.Tween | undefined;
  const observer = new MutationObserver((records) => {
    const turned = records.flatMap((record) => (record.target instanceof HTMLElement && record.target.dir !== record.oldValue ? [record.target] : []));
    // The outermost element that turned carries the rest.
    const target = turned.find((element) => !turned.some((other) => other !== element && other.contains(element)));
    if (!target || (target.dir !== "rtl" && target.dir !== "ltr")) return;
    sweep?.revert();
    sweep = gsap.fromTo(
      target,
      { clipPath: target.dir === "rtl" ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: SWEEP, ease: "power3.out", clearProps: "clipPath" },
    );
  });
  observer.observe(demo, { attributes: true, attributeFilter: ["dir"], attributeOldValue: true, subtree: true });
  return () => {
    observer.disconnect();
    sweep?.revert();
  };
}
