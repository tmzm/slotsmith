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
 *   languages sweep) in {@link runGsap}, still to be written: `gsap` is not
 *   installed yet (docs/LAUNCH-REPORT.md, "Deferred"). It is the only place
 *   GSAP may be imported.
 *
 * Only transform, clip-path and the border colour flash are animated, and
 * every directional motion mirrors under `dir="rtl"`.
 */
import { waveOrder } from "@/lib/wave";

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
    cleanups.push(await runGsap(root, opts));
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
 * The GSAP choreography. TODO(gsap): write this once `gsap` is installed
 * (docs/LAUNCH-REPORT.md, "Deferred"). Until then it starts nothing, and the
 * swap section keeps its static state (the table beside the labelled
 * diagram), which is also its reduced-motion and no-JS state.
 *
 * What it must do (plan 02 Task 6, DESIGN.md sections 6 and 7):
 * 1. Import `gsap` and `gsap/ScrollTrigger` here with `import()`, and register
 *    the plugin. Nowhere else imports them.
 * 2. **Exploded view.** On `[data-motion="swap"]`, remove `data-static` from
 *    its `.explode` element (the static figure hides, the demo box makes room;
 *    do it while pinned so the layout change stays out of CLS), pin the
 *    section for about one viewport of scroll, and tween `--explode` on the
 *    `.explode` element 0 → 1 → 0 with `scrub`. CSS computes every transform
 *    and label opacity from `--explode` (`styles/explode.css`); animate
 *    nothing else. ExplodedView already negates `--dx` under `dir="rtl"`.
 * 3. **Switch.** Listen for `swap:before` on the `.swap` root and call
 *    `event.detail.waitUntil(promise)` with a promise that resolves when
 *    `--explode` has reached 0.6 (the island holds the switch until then,
 *    700ms at most); on `swap:after`, tween `--explode` back to 0. The whole
 *    explode, swap and reassemble takes 700ms at most. A `swap:before` may
 *    get no `swap:after` (a later choice replaced it): reassemble anyway.
 * 4. **Languages sweep.** Watch the languages demo (`[data-sample=
 *    "landing/languages"]`) for its table's `dir` changing and play a 280ms
 *    `clip-path` sweep in the new reading direction (from the right edge for
 *    `rtl`, from the left for `ltr`).
 * 5. If anything fails, put `data-static` back and kill every trigger. The
 *    returned cleanup kills every tween, ScrollTrigger and listener it made
 *    (`gsap.context(...).revert()`).
 *
 * @returns A cleanup for everything it started.
 */
async function runGsap(_root: Document, _opts: LandingMotionOptions): Promise<() => void> {
  return noop;
}
