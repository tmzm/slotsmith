// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Evaluating the real module would flip this flag. GSAP is not installed yet,
// so the mocks are virtual; they only record whether anything loaded them.
const loaded = vi.hoisted(() => ({ gsap: false }));
vi.mock("gsap", () => {
  loaded.gsap = true;
  return { gsap: {}, default: {} };
});
vi.mock("gsap/ScrollTrigger", () => {
  loaded.gsap = true;
  return { ScrollTrigger: {} };
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
});

describe("startLandingMotion", () => {
  it("does nothing under reduced motion and never loads GSAP", async () => {
    const { animate } = panels([{ top: 100, left: 0, right: 100 }]);
    const cleanup = await startLandingMotion(document, { reducedMotion: true, rtl: false });
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    expect(loaded.gsap).toBe(false);
    expect(animate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WAVE_SESSION_KEY)).toBeNull();
  });

  it("does not load GSAP on the motion path either, until it is installed", async () => {
    panels([{ top: 100, left: 0, right: 100 }]);
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    cleanup();
    expect(loaded.gsap).toBe(false);
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
