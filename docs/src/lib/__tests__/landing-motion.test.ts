// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Animate = ReturnType<typeof vi.fn>;
type Vars = Record<string, unknown> & { onUpdate?: () => void; onComplete?: () => void; scrollTrigger?: PinConfig };
interface PinConfig {
  onEnter(): void;
  onEnterBack(): void;
  onToggle(): void;
}
interface Pin {
  config: PinConfig;
  isActive: boolean;
  progress: number;
  kill: Animate;
}
interface Tween {
  target: Record<string, number>;
  vars: Vars;
  kill: Animate;
}

// Stand-ins for GSAP. Each test imports the motion module afresh
// (`vi.resetModules`), so `loaded` shows what its run loaded. The fake keeps
// what the module asks of it: `to` tweens are finished by hand (`finish`), the
// timeline hands out a pin the test switches on and off, and `matchMedia`
// runs a context's function at once and undoes it on `revert`.
const loaded = vi.hoisted(() => ({ gsap: false, scrollTrigger: false }));
const fake = vi.hoisted(() => {
  const state = {
    tweens: [] as unknown[],
    pins: [] as unknown[],
    media: [] as { query: string }[],
    undo: [] as (() => void)[],
    fromTo: vi.fn((_target: unknown, _from: unknown, _to: unknown) => ({ revert: vi.fn() })),
    failTimeline: false,
    failMatchMedia: false,
  };
  const gsap = {
    registerPlugin: vi.fn(),
    matchMedia: vi.fn(() => {
      if (state.failMatchMedia) throw new Error("no matchMedia");
      return {
        add: vi.fn((query: string, run: () => (() => void) | void) => {
          state.media.push({ query });
          const undo = run();
          if (undo) state.undo.push(undo);
        }),
        revert: vi.fn(() => {
          for (const undo of state.undo.splice(0).reverse()) undo();
        }),
      };
    }),
    to: vi.fn((target: Record<string, number>, vars: Vars) => {
      const tween = { target, vars, kill: vi.fn() };
      state.tweens.push(tween);
      return tween;
    }),
    timeline: vi.fn((vars: Vars) => {
      if (state.failTimeline) throw new Error("no timeline");
      const pin = { config: vars.scrollTrigger!, isActive: false, progress: 0, kill: vi.fn() };
      state.pins.push(pin);
      const chain = { scrollTrigger: pin, to: vi.fn(() => chain), kill: vi.fn() };
      return chain;
    }),
    fromTo: (...args: [unknown, unknown, unknown]) => state.fromTo(...args),
  };
  return { state, gsap, ScrollTrigger: { refresh: vi.fn() } };
});
let startLandingMotion: typeof import("@/lib/landing-motion").startLandingMotion;
let WAVE_SESSION_KEY: string;

/** Puts panels on the page with fixed boxes; jsdom has no layout or Web Animations. */
function panels(rects: { top: number; left: number; right: number }[]): { elements: HTMLElement[]; animate: Animate } {
  const animate = vi.fn(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));
  const elements = rects.map((rect, index) => {
    const element = document.createElement("div");
    element.setAttribute("data-panel", "");
    element.id = `panel-${index}`;
    element.getBoundingClientRect = () => ({ ...rect, bottom: rect.top + 100, width: rect.right - rect.left, height: 100, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect;
    (element as unknown as { animate: Animate }).animate = animate;
    document.body.append(element);
    return element;
  });
  return { elements, animate };
}

const tweens = () => fake.state.tweens as Tween[];
const pins = () => fake.state.pins as Pin[];
/** Runs a tween to its end: its target takes the final values, then it completes. */
function finish(tween: Tween) {
  for (const [key, value] of Object.entries(tween.vars)) if (typeof value === "number" && key in tween.target) tween.target[key] = value;
  tween.vars.onUpdate?.();
  tween.vars.onComplete?.();
}
/** The tween that opens (`to: 0.6`) or closes (`to: 0`) the switch's mini explode, the latest of its kind. */
const miniTween = (to: number) => tweens().findLast((tween) => tween.vars.mini === to)!;

beforeEach(async () => {
  vi.resetModules();
  // doMock, not mock: the factories run again for every fresh import, so `loaded` shows this test's run only.
  vi.doMock("gsap", () => {
    loaded.gsap = true;
    return { gsap: fake.gsap, default: fake.gsap };
  });
  vi.doMock("gsap/ScrollTrigger", () => {
    loaded.scrollTrigger = true;
    return { ScrollTrigger: fake.ScrollTrigger };
  });
  loaded.gsap = false;
  loaded.scrollTrigger = false;
  Object.assign(fake.state, { tweens: [], pins: [], media: [], undo: [], failTimeline: false, failMatchMedia: false });
  ({ startLandingMotion, WAVE_SESSION_KEY } = await import("@/lib/landing-motion"));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  sessionStorage.clear();
  vi.spyOn(performance, "now").mockReturnValue(500);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/** The landing's hooks: the swap section in its static state and the languages demo. */
function landing(island = false): { explode: HTMLElement; swap: HTMLElement; table: HTMLElement; wrapper: HTMLElement } {
  const swap = `<div class="swap"><div class="explode" data-static=""><div class="swap__frame"></div></div></div>`;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<section data-motion="swap">${island ? `<astro-island ssr="">${swap}</astro-island>` : swap}</section>
     <figure data-sample="landing/languages"><div dir="ltr" id="orders"></div></figure>`,
  );
  return {
    explode: document.querySelector<HTMLElement>(".explode")!,
    swap: document.querySelector<HTMLElement>(".swap")!,
    table: document.querySelector<HTMLElement>("#orders")!,
    wrapper: document.querySelector<HTMLElement>("section")!,
  };
}

/** Starts the motion on the landing and has the pin hold the view: the state a reader is in mid-scroll. */
async function pinned() {
  const page = landing();
  const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
  const pin = pins()[0]!;
  pin.config.onEnter();
  return { ...page, cleanup, pin };
}

/** A switch as the island starts it: the event carries `waitUntil`, whose promise settles when the hold ends. */
function switchStarts(swap: HTMLElement) {
  const held = { settled: false };
  swap.dispatchEvent(
    new CustomEvent("swap:before", {
      detail: {
        waitUntil: (promise: Promise<unknown>) => {
          void promise.then(() => {
            held.settled = true;
          });
        },
      },
    }),
  );
  return held;
}

describe("startLandingMotion", () => {
  it("does nothing under reduced motion and never loads GSAP", async () => {
    const { animate } = panels([{ top: 100, left: 0, right: 100 }]);
    const cleanup = await startLandingMotion(document, { reducedMotion: true, rtl: false });
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    landing();
    const again = await startLandingMotion(document, { reducedMotion: true, rtl: false });
    again();
    expect(loaded).toEqual({ gsap: false, scrollTrigger: false });
    expect(animate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WAVE_SESSION_KEY)).toBeNull();
  });

  it("does not load GSAP on a page without the landing's hooks", async () => {
    panels([{ top: 100, left: 0, right: 100 }]);
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    cleanup();
    expect(loaded).toEqual({ gsap: false, scrollTrigger: false });
    expect(fake.gsap.registerPlugin).not.toHaveBeenCalled();
  });

  it("loads GSAP and ScrollTrigger with import() on the landing's motion path", async () => {
    const { explode } = landing();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(loaded).toEqual({ gsap: true, scrollTrigger: true });
    expect(fake.gsap.registerPlugin).toHaveBeenCalledWith(fake.ScrollTrigger);
    // The pin needs a wide, tall screen and the reader's consent to motion; the sweep needs the consent.
    const queries = fake.state.media.map((entry) => entry.query);
    expect(queries[0]).toMatch(/min-width.*prefers-reduced-motion: no-preference/);
    expect(queries[1]).toBe("(prefers-reduced-motion: no-preference)");
    // Set up, but the figure stays until the pin holds the view.
    expect(pins()).toHaveLength(1);
    expect(explode.hasAttribute("data-static")).toBe(true);
    cleanup();
  });

  it("sweeps the languages demo in the new reading direction when it turns", async () => {
    const { table } = landing();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    table.dir = "rtl";
    await Promise.resolve();
    expect(fake.state.fromTo).toHaveBeenLastCalledWith(table, { clipPath: "inset(0% 0% 0% 100%)" }, expect.objectContaining({ clipPath: "inset(0% 0% 0% 0%)", duration: 0.28 }));
    table.dir = "ltr";
    await Promise.resolve();
    expect(fake.state.fromTo).toHaveBeenLastCalledWith(table, { clipPath: "inset(0% 100% 0% 0%)" }, expect.objectContaining({ duration: 0.28 }));
    cleanup();
    table.dir = "rtl";
    await Promise.resolve();
    expect(fake.state.fromTo).toHaveBeenCalledTimes(2);
  });

  it("undoes the pin, the mini explode and the sweep when reduced motion is turned on mid-session", async () => {
    const { explode, table, pin } = await pinned();
    expect(explode.hasAttribute("data-static")).toBe(false);
    // `gsap.matchMedia` reverts its contexts when the query stops matching.
    for (const undo of fake.state.undo.splice(0).reverse()) undo();
    expect(explode.hasAttribute("data-static")).toBe(true);
    expect(explode.style.getPropertyValue("--explode")).toBe("");
    expect(pin.kill).toHaveBeenCalledWith(true);
    table.dir = "rtl";
    await Promise.resolve();
    expect(fake.state.fromTo).not.toHaveBeenCalled();
  });

  it("loads nothing until a restored scroll position has settled on a reload", async () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type: "reload" }] as never);
    let now = 500;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const tick = async (ms: number) => {
      for (let spent = 0; spent < ms; spent += 50) {
        now += 50;
        await vi.advanceTimersByTimeAsync(50);
      }
    };
    landing();
    const started = startLandingMotion(document, { reducedMotion: false, rtl: false });
    await tick(300);
    // The browser restores the position as the page grows: the wait starts over.
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1300 });
    await tick(300);
    expect(loaded.gsap).toBe(false);
    await tick(200);
    const cleanup = await started;
    expect(loaded).toEqual({ gsap: true, scrollTrigger: true });
    expect(pins()).toHaveLength(1);
    cleanup();
  });

  it("does not wait on a fresh visit", async () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type: "navigate" }] as never);
    landing();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(pins()).toHaveLength(1);
    cleanup();
  });

  it("takes the figure off screen inside the pin, once the island has hydrated", async () => {
    const { explode } = landing(true);
    const island = document.querySelector("astro-island")!;
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    const pin = pins()[0]!;
    pin.isActive = true;
    pin.config.onEnter();
    // The floating labels do not exist before hydration.
    expect(explode.hasAttribute("data-static")).toBe(true);
    island.removeAttribute("ssr");
    island.dispatchEvent(new Event("astro:hydrate"));
    expect(explode.hasAttribute("data-static")).toBe(false);
    cleanup();
  });

  it("measures the pin again after taking over", async () => {
    vi.useFakeTimers();
    await pinned();
    expect(fake.ScrollTrigger.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fake.ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
  });

  it("lets the demo box scroll again once the pin lets go or the view is back at rest", async () => {
    const { explode, pin } = await pinned();
    pin.isActive = true;
    pin.config.onToggle();
    expect(explode.hasAttribute("data-driven")).toBe(true);
    // Late in the pin with the view assembled again.
    pin.progress = 0.9;
    pin.config.onToggle();
    expect(explode.hasAttribute("data-driven")).toBe(false);
    pin.progress = 0.5;
    pin.config.onToggle();
    pin.isActive = false;
    pin.config.onToggle();
    expect(explode.hasAttribute("data-driven")).toBe(false);
  });

  it("holds the switch until the view is 0.6 open, then lets it go and reassembles on swap:after", async () => {
    vi.useFakeTimers();
    const { swap, explode } = await pinned();
    const held = switchStarts(swap);
    const open = miniTween(0.6);
    expect(open.vars.duration).toBeLessThanOrEqual(0.35);
    await Promise.resolve();
    expect(held.settled).toBe(false);
    finish(open);
    await Promise.resolve();
    expect(held.settled).toBe(true);
    expect(explode.style.getPropertyValue("--explode")).toBe("0.6");
    swap.dispatchEvent(new CustomEvent("swap:after"));
    const close = miniTween(0);
    // 240ms out and at most 360ms back, inside the 700ms budget.
    expect((open.vars.duration as number) + (close.vars.duration as number)).toBeLessThanOrEqual(0.7);
    // A second swap:after does not start another way back.
    swap.dispatchEvent(new CustomEvent("swap:after"));
    expect(tweens().filter((tween) => tween.vars.mini === 0)).toHaveLength(1);
    finish(close);
    expect(explode.style.getPropertyValue("--explode")).toBe("0");
  });

  it("reassembles on its own when no swap:after follows", async () => {
    vi.useFakeTimers();
    const { swap } = await pinned();
    switchStarts(swap);
    finish(miniTween(0.6));
    expect(tweens().some((tween) => tween.vars.mini === 0)).toBe(false);
    vi.advanceTimersByTime(100);
    expect(tweens().some((tween) => tween.vars.mini === 0)).toBe(true);
  });

  it("lets an earlier switch go when a later one replaces it", async () => {
    vi.useFakeTimers();
    const { swap } = await pinned();
    const first = switchStarts(swap);
    const second = switchStarts(swap);
    await Promise.resolve();
    expect(first.settled).toBe(true);
    expect(second.settled).toBe(false);
    finish(miniTween(0.6));
    await Promise.resolve();
    expect(second.settled).toBe(true);
  });

  it("does not hold a switch while the figure is still static", async () => {
    const { swap } = landing();
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    const waitUntil = vi.fn();
    swap.dispatchEvent(new CustomEvent("swap:before", { detail: { waitUntil } }));
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("restores the static state on cleanup and stops listening", async () => {
    const { explode, swap, cleanup, pin } = await pinned();
    explode.setAttribute("data-driven", "");
    explode.style.setProperty("--explode", "0.4");
    cleanup();
    expect(explode.hasAttribute("data-static")).toBe(true);
    expect(explode.hasAttribute("data-driven")).toBe(false);
    expect(explode.style.getPropertyValue("--explode")).toBe("");
    expect(pin.kill).toHaveBeenCalledWith(true);
    const waitUntil = vi.fn();
    swap.dispatchEvent(new CustomEvent("swap:before", { detail: { waitUntil } }));
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("leaves the page static when the pin cannot be set up", async () => {
    const { explode, swap } = landing();
    fake.state.failTimeline = true;
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(explode.hasAttribute("data-static")).toBe(true);
    const waitUntil = vi.fn();
    swap.dispatchEvent(new CustomEvent("swap:before", { detail: { waitUntil } }));
    expect(waitUntil).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it("leaves the page static when GSAP fails to set up", async () => {
    const { explode } = landing();
    fake.state.failMatchMedia = true;
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(explode.hasAttribute("data-static")).toBe(true);
    expect(() => cleanup()).not.toThrow();
  });

  it("raises the panels above the fold in wave order, once per session", async () => {
    const { elements, animate } = panels([
      { top: 100, left: 600, right: 900 },
      { top: 100, left: 40, right: 560 },
      { top: 2000, left: 40, right: 560 },
    ]);
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    const order = animate.mock.contexts.map((element: HTMLElement) => element.id);
    // Each panel gets its rise and its border flash; the one below the fold gets neither.
    expect([...new Set(order)]).toEqual(["panel-1", "panel-0"]);
    expect(order).not.toContain(elements[2]!.id);
    const [keyframes] = animate.mock.calls[0] as unknown as [Keyframe[]];
    expect(keyframes[0]).toMatchObject({ clipPath: "inset(0 0 100% 0)", transform: "translateY(18px)" });
    expect(sessionStorage.getItem(WAVE_SESSION_KEY)).toBe("1");

    animate.mockClear();
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(animate).not.toHaveBeenCalled();
  });

  it("mirrors the wave on right-to-left pages", async () => {
    const { animate } = panels([
      { top: 100, left: 40, right: 560 },
      { top: 100, left: 600, right: 900 },
    ]);
    await startLandingMotion(document, { reducedMotion: false, rtl: true });
    const order = [...new Set(animate.mock.contexts.map((element: HTMLElement) => element.id))];
    expect(order).toEqual(["panel-1", "panel-0"]);
  });

  it("skips the wave when the reader has already scrolled or has been reading for a while", async () => {
    const { animate } = panels([{ top: 100, left: 0, right: 100 }]);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    vi.spyOn(performance, "now").mockReturnValue(5000);
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(animate).not.toHaveBeenCalled();
  });

  it("still runs when session storage throws, and the cleanup cancels the wave", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { animate } = panels([{ top: 100, left: 0, right: 100 }]);
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(animate).toHaveBeenCalled();
    cleanup();
    for (const result of animate.mock.results) expect((result.value as { cancel: Animate }).cancel).toHaveBeenCalled();
  });
});
