// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stand-ins for GSAP: evaluating either module flips its flag, and the stub
// records what the motion module asks of it. `matchMedia().add` runs nothing,
// as on a screen below the pin's breakpoint.
const loaded = vi.hoisted(() => ({ gsap: false, scrollTrigger: false }));
const stub = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
  matchMedia: vi.fn(() => ({ add: vi.fn(), revert: vi.fn() })),
  fromTo: vi.fn(() => ({ revert: vi.fn() })),
  ScrollTrigger: { refresh: vi.fn() },
}));
vi.mock("gsap", () => {
  loaded.gsap = true;
  return { gsap: stub, default: stub };
});
vi.mock("gsap/ScrollTrigger", () => {
  loaded.scrollTrigger = true;
  return { ScrollTrigger: stub.ScrollTrigger };
});

import { startLandingMotion, WAVE_SESSION_KEY } from "@/lib/landing-motion";

type Animate = ReturnType<typeof vi.fn>;

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

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(performance, "now").mockReturnValue(500);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/** The landing's hooks: the swap section in its static state and the languages demo. */
function landing(): { explode: HTMLElement; table: HTMLElement } {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<section data-motion="swap"><div class="swap"><div class="explode" data-static=""><div class="swap__frame"></div></div></div></section>
     <figure data-sample="landing/languages"><div dir="ltr" id="orders"></div></figure>`,
  );
  return { explode: document.querySelector<HTMLElement>(".explode")!, table: document.querySelector<HTMLElement>("#orders")! };
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
    expect(stub.registerPlugin).not.toHaveBeenCalled();
  });

  it("loads GSAP and ScrollTrigger with import() on the landing's motion path", async () => {
    const { explode } = landing();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    expect(loaded).toEqual({ gsap: true, scrollTrigger: true });
    expect(stub.registerPlugin).toHaveBeenCalledWith(stub.ScrollTrigger);
    // The pinned view is set up behind a media query; below it the static state stays.
    const media = stub.matchMedia.mock.results[0]!.value as { add: Animate; revert: Animate };
    expect(media.add).toHaveBeenCalledWith(expect.stringContaining("min-width"), expect.any(Function));
    expect(explode.hasAttribute("data-static")).toBe(true);
    cleanup();
    expect(media.revert).toHaveBeenCalled();
  });

  it("sweeps the languages demo in the new reading direction when it turns", async () => {
    const { table } = landing();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    table.dir = "rtl";
    await Promise.resolve();
    expect(stub.fromTo).toHaveBeenLastCalledWith(table, { clipPath: "inset(0% 0% 0% 100%)" }, expect.objectContaining({ clipPath: "inset(0% 0% 0% 0%)", duration: 0.28 }));
    table.dir = "ltr";
    await Promise.resolve();
    expect(stub.fromTo).toHaveBeenLastCalledWith(table, { clipPath: "inset(0% 100% 0% 0%)" }, expect.objectContaining({ duration: 0.28 }));
    cleanup();
    table.dir = "rtl";
    await Promise.resolve();
    expect(stub.fromTo).toHaveBeenCalledTimes(2);
  });

  it("leaves the page static when GSAP fails to set up", async () => {
    const { explode } = landing();
    stub.matchMedia.mockImplementationOnce(() => {
      throw new Error("no matchMedia");
    });
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
