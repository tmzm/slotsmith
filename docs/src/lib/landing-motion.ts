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
const PIN_QUERY = "(min-width: 1024px) and (min-height: 660px)";
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

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);

  const cleanups: (() => void)[] = [];
  const cleanup = () => {
    for (const undo of cleanups.splice(0).reverse()) undo();
  };
  try {
    if (section) {
      const media = gsap.matchMedia();
      cleanups.push(() => media.revert());
      media.add(PIN_QUERY, () => explodedView(gsap, ScrollTrigger, view, section));
    }
    if (languages) cleanups.push(languagesSweep(gsap, languages));
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}

/**
 * The exploded view (DESIGN.md section 6, item 2).
 *
 * **Taking over.** Removing `data-static` from `.explode` takes the static
 * figure off screen and gives the demo box room for the parts, which moves
 * the table. To keep that out of the layout-shift score it happens only while
 * `.explode` is outside the viewport, and once the island has hydrated, so
 * the floating labels exist. A reader who loads the page with the demo in
 * view keeps the static state until it scrolls out. The figure stays in the
 * accessibility tree afterwards (`styles/explode.css`).
 *
 * **Pin.** The section is pinned for one viewport of scroll with the demo box
 * centred under the header, and `--explode` on `.explode` goes 0 → 1 → 0 with
 * `scrub`. CSS computes every transform and label opacity from it. The pin's
 * spacer reserves the scroll distance, and the page is measured again when
 * its height changes. From one viewport before the pin until it lets go,
 * `.explode` carries `data-driven`: the demo box goes back to its top and
 * stops scrolling on its own, so the wheel over it keeps moving the page and
 * the table explodes whole. Its controls still take clicks and focus, and it
 * scrolls again once the pin has let go.
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
  const box = frame.querySelector<HTMLElement>(".swap__box");
  const island = swap.closest("astro-island");

  const state = { scroll: 0, mini: 0 };
  const apply = () => explode.style.setProperty("--explode", String(Math.round(Math.max(state.scroll, state.mini) * 1000) / 1000));

  let live = false;
  let timeline: gsap.core.Timeline | undefined;
  let driven: ScrollTrigger | undefined;
  let rewind: gsap.core.Tween | undefined;
  let mini: gsap.core.Tween | undefined;
  let orphan: ReturnType<typeof setTimeout> | undefined;
  let refresh: ReturnType<typeof setTimeout> | undefined;
  let height = 0;

  /** Where the demo box's centre sits while pinned: mid-viewport under the header, lower when the control would slide under it. */
  const pinAt = () => {
    const top = header?.offsetHeight ?? 0;
    const above = control ? frame.getBoundingClientRect().top - control.getBoundingClientRect().top : 0;
    return Math.round(Math.max((view.innerHeight + top) / 2, top + 16 + above + frame.offsetHeight / 2));
  };

  const takeOver = () => {
    live = true;
    explode.removeAttribute("data-static");
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
          onRefresh: () => {
            height = root.body.scrollHeight;
          },
        },
      })
      .to(state, { scroll: 1, duration: 0.4 })
      .to(state, { scroll: 1, duration: 0.2 })
      .to(state, { scroll: 0, duration: 0.4 });
    const pin = timeline.scrollTrigger!;
    driven = ScrollTrigger.create({
      start: () => Math.max(0, pin.start - view.innerHeight),
      end: () => pin.end,
      onToggle: (self) => {
        explode.toggleAttribute("data-driven", self.isActive);
        if (self.isActive && box && box.scrollTop > 0) rewind = gsap.to(box, { scrollTop: 0, duration: 0.25, ease: "power2.out", overwrite: true });
      },
    });
    height = root.body.scrollHeight;
  };

  // Take over when the island has hydrated and the view is out of sight.
  const sight = new IntersectionObserver(([entry]) => {
    if (!entry || entry.isIntersecting || live) return;
    sight.disconnect();
    takeOver();
  });
  const watch = () => sight.observe(explode);
  if (island?.hasAttribute("ssr")) island.addEventListener("astro:hydrate", watch, { once: true });
  else watch();

  // The page's height changing (fonts, an opened answer, a loaded demo) moves the pin's start.
  const resize = new ResizeObserver(() => {
    if (!live || root.body.scrollHeight === height) return;
    clearTimeout(refresh);
    refresh = setTimeout(() => ScrollTrigger.refresh(), 200);
  });
  resize.observe(root.body);

  const reassemble = () => {
    clearTimeout(orphan);
    mini?.kill();
    mini = gsap.to(state, { mini: 0, duration: MINI_BACK, ease: "power2.inOut", onUpdate: apply });
  };
  const onBefore = (event: Event) => {
    const detail = (event as CustomEvent<{ waitUntil?: (promise: Promise<unknown>) => void } | undefined>).detail;
    if (!live || typeof detail?.waitUntil !== "function") return;
    clearTimeout(orphan);
    mini?.kill();
    // Already open this far (mid-scroll, or a switch right after another): nothing to wait for.
    if (Math.max(state.scroll, state.mini) >= MINI_PEAK) {
      if (state.mini > 0) orphan = setTimeout(reassemble, MINI_ORPHAN);
      return;
    }
    detail.waitUntil(
      new Promise<void>((resolve) => {
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
          // Replaced by a later switch: let this one go.
          onInterrupt: () => resolve(),
        });
      }),
    );
  };
  const onAfter = () => {
    if (live && state.mini > 0) reassemble();
  };
  swap.addEventListener("swap:before", onBefore);
  swap.addEventListener("swap:after", onAfter);

  return () => {
    sight.disconnect();
    resize.disconnect();
    island?.removeEventListener("astro:hydrate", watch);
    swap.removeEventListener("swap:before", onBefore);
    swap.removeEventListener("swap:after", onAfter);
    clearTimeout(orphan);
    clearTimeout(refresh);
    mini?.kill();
    rewind?.kill();
    driven?.kill();
    timeline?.scrollTrigger?.kill(true);
    timeline?.kill();
    explode.style.removeProperty("--explode");
    explode.removeAttribute("data-driven");
    explode.setAttribute("data-static", "");
    live = false;
  };
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
