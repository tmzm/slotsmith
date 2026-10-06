// @vitest-environment jsdom
// The adapter demos load whole design systems, so each case takes long on a cold run: they live apart from the guide tests.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { PROVIDERS, type ProviderName } from "@samples/adapters/providers";
import AntdDemo from "@samples/adapters/date-picker/antd-demo";
import ChakraDemo from "@samples/adapters/date-picker/chakra-demo";
import MuiDemo from "@samples/adapters/date-picker/mui-demo";
import RadixDemo from "@samples/adapters/date-picker/radix-demo";
import ShadcnDemo from "@samples/adapters/date-picker/shadcn-demo";

/** A Monday. The samples read today from the clock once mounted, so the tests pin it. */
const NOW = new Date(2026, 2, 16, 12);

let consoleError: MockInstance;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const key = (element: Element, name: string) => fireEvent.keyDown(element, { key: name });
/** The day button for a date in the open calendar. */
const day = (date: string) => document.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!;
const focusedDate = () => document.activeElement?.getAttribute("data-date");

/** Each adapter demo and an element only that library renders, once the calendar is open. */
const ADAPTER_DEMOS: [name: ProviderName, Demo: ComponentType, marker: string][] = [
  ["shadcn", ShadcnDemo, '[data-slot="date-picker"]'],
  ["mui", MuiDemo, ".MuiPaper-root"],
  ["chakra", ChakraDemo, "[class*='chakra-button']"],
  ["antd", AntdDemo, ".ant-btn"],
  ["radix", RadixDemo, ".rt-Button, .rt-IconButton"],
];

describe("date picker adapter demos", () => {
  beforeAll(() => {
    // MUI, Chakra and Radix read these on mount.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.hasPointerCapture ??= () => false;
    proto.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  it.each(ADAPTER_DEMOS)("%s: shows a range with the library's parts, applies a preset and picks a new range", { timeout: 60000 }, (name, Demo, marker) => {
    const Provider = PROVIDERS[name];
    const { container } = render(
      <Provider theme="dark" dir="ltr">
        <Demo />
      </Provider>,
    );
    const combobox = screen.getByRole("combobox", { name: "Stay" });
    expect(combobox.textContent).toContain("Mar 18, 2026 — Mar 21, 2026");
    fireEvent.click(combobox);
    expect(container.querySelector(marker), `${name} parts`).not.toBeNull();
    expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("March 2026");
    expect(day("2026-03-18").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-21").hasAttribute("data-range-end")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next 7 days" }));
    expect(combobox.textContent).toContain("Mar 16, 2026 — Mar 22, 2026");
    fireEvent.click(day("2026-03-24"));
    fireEvent.click(day("2026-03-26"));
    expect(combobox.textContent).toContain("Mar 24, 2026 — Mar 26, 2026");
    key(day("2026-03-26"), "ArrowRight");
    expect(focusedDate()).toBe("2026-03-27");
    key(day("2026-03-27"), "Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(combobox);
  });
});
