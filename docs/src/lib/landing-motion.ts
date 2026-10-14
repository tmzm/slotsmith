/**
 * Landing motion (docs/DESIGN.md sections 6 and 7)
 *
 * The landing's choreography. `MotionLoader.astro` imports this module with
 * `import()` after `load`, and only when `prefers-reduced-motion` is not
 * `reduce`, so none of it is in the landing's initial JavaScript. The page is
 * complete without it: every panel is visible in the HTML and every control
 * works before and without this module.
 *
 * Two parts, both with the Web Animations API (no library):
 * - The first-load wave.
 * - The languages demo's direction sweep.
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

/** The motion the reader may turn off while the page is open. */
const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
/** The languages demo's sweep, in ms. */
const SWEEP = 280;
/** The sweep's easing: a cubic ease-out, fast then settling. */
const EASE_OUT_CUBIC = "cubic-bezier(0.215, 0.61, 0.355, 1)";

const noop = () => {};

/**
 * Starts the landing choreography.
 *
 * @param root - The landing's document.
 * @param opts - Reduced motion and reading direction, read by the caller from `matchMedia` and `<html dir>`.
 * @returns A cleanup that stops everything this call started. Under reduced motion it is a no-op.
 */
export async function startLandingMotion(root: Document, opts: LandingMotionOptions): Promise<() => void> {
  if (opts.reducedMotion) return noop;
  const cleanups = [playWave(root, opts.rtl)];
  const languages = root.querySelector<HTMLElement>('[data-sample="landing/languages"]');
  if (languages) cleanups.push(languagesSweep(languages));
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
 * The languages demo's sweep (DESIGN.md section 6, item 6): when the demo's
 * table changes direction, it is revealed again by a 280ms `clip-path` sweep
 * in the new reading direction, from the right edge for `rtl` and from the
 * left for `ltr`. A change of language that keeps the direction plays nothing,
 * and nothing plays once the reader turns reduced motion on.
 *
 * @returns A cleanup that stops watching and clears a sweep in flight.
 */
function languagesSweep(demo: HTMLElement): () => void {
  const view = demo.ownerDocument.defaultView;
  const motion = view?.matchMedia?.(MOTION_QUERY);
  let sweep: Animation | undefined;
  const observer = new MutationObserver((records) => {
    if (motion && !motion.matches) return;
    const turned = records.flatMap((record) => (record.target instanceof HTMLElement && record.target.dir !== record.oldValue ? [record.target] : []));
    // The outermost element that turned carries the rest.
    const target = turned.find((element) => !turned.some((other) => other !== element && other.contains(element)));
    if (!target || (target.dir !== "rtl" && target.dir !== "ltr") || typeof target.animate !== "function") return;
    sweep?.cancel();
    sweep = target.animate(
      [{ clipPath: target.dir === "rtl" ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
      { duration: SWEEP, easing: EASE_OUT_CUBIC },
    );
  });
  observer.observe(demo, { attributes: true, attributeFilter: ["dir"], attributeOldValue: true, subtree: true });
  const stop = () => sweep?.cancel();
  motion?.addEventListener?.("change", stop);
  return () => {
    observer.disconnect();
    motion?.removeEventListener?.("change", stop);
    stop();
  };
}
