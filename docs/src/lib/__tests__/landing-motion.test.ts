// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** The reader's motion preference, switchable mid-session. */
function motionQuery(matches = true) {
  const listeners = new Set<() => void>();
  const query = {
    matches,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    query,
    turnOff() {
      query.matches = false;
      for (const listener of listeners) listener();
    },
  };
}

/** The languages demo, its table able to animate. */
function languages(): { table: HTMLElement; animate: Animate; sweeps: { cancel: Animate }[] } {
  document.body.insertAdjacentHTML("beforeend", `<figure data-sample="landing/languages"><div dir="ltr" id="orders"></div></figure>`);
  const table = document.querySelector<HTMLElement>("#orders")!;
  const sweeps: { cancel: Animate }[] = [];
  const animate = vi.fn(() => {
    const sweep = { cancel: vi.fn() };
    sweeps.push(sweep);
    return sweep;
  });
  (table as unknown as { animate: Animate }).animate = animate;
  return { table, animate, sweeps };
}

beforeEach(() => {
  sessionStorage.clear();
  motionQuery();
  vi.spyOn(performance, "now").mockReturnValue(500);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("startLandingMotion", () => {
  it("ships no motion library: the module imports none", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/landing-motion.ts"), "utf8");
    expect(source).not.toMatch(/gsap|ScrollTrigger/i);
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty("gsap");
  });

  it("does nothing under reduced motion", async () => {
    const { animate } = panels([{ top: 100, left: 0, right: 100 }]);
    const { table, animate: sweep } = languages();
    const cleanup = await startLandingMotion(document, { reducedMotion: true, rtl: false });
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    table.dir = "rtl";
    await Promise.resolve();
    expect(animate).not.toHaveBeenCalled();
    expect(sweep).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(WAVE_SESSION_KEY)).toBeNull();
  });

  it("sweeps the languages demo in the new reading direction for 280ms when it turns", async () => {
    const { table, animate } = languages();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    table.dir = "rtl";
    await Promise.resolve();
    expect(animate).toHaveBeenLastCalledWith([{ clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)" }], expect.objectContaining({ duration: 280 }));
    table.dir = "ltr";
    await Promise.resolve();
    expect(animate).toHaveBeenLastCalledWith([{ clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }], expect.objectContaining({ duration: 280 }));
    cleanup();
    table.dir = "rtl";
    await Promise.resolve();
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("plays nothing when the language changes but the direction does not", async () => {
    const { table, animate } = languages();
    await startLandingMotion(document, { reducedMotion: false, rtl: false });
    table.dir = "ltr";
    table.lang = "fr";
    await Promise.resolve();
    expect(animate).not.toHaveBeenCalled();
  });

  it("stops sweeping, and clears a sweep in flight, when reduced motion is turned on mid-session", async () => {
    const motion = motionQuery();
    const { table, animate, sweeps } = languages();
    const cleanup = await startLandingMotion(document, { reducedMotion: false, rtl: false });
    table.dir = "rtl";
    await Promise.resolve();
    motion.turnOff();
    expect(sweeps[0]!.cancel).toHaveBeenCalled();
    table.dir = "ltr";
    await Promise.resolve();
    expect(animate).toHaveBeenCalledTimes(1);
    cleanup();
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
