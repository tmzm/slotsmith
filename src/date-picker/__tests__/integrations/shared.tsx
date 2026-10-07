import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { DatePicker, type DatePickerComponents, type DatePickerProps } from "../../index";
import { day, focusedDate, open } from "../builders";

/**
 * Stub browser APIs
 *
 * jsdom lacks APIs that Ark/zag (Chakra) and MUI call: pointer capture,
 * scrollIntoView, matchMedia and ResizeObserver.
 */
export function stubBrowserApis() {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
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
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Fail on React warnings
 *
 * Spies on `console.error` / `console.warn` around every test and fails it if
 * React complained — e.g. about an unknown prop reaching the DOM, which would
 * mean a slot received something other than DOM props.
 */
export function failOnReactWarnings() {
  let error: MockInstance;
  let warn: MockInstance;
  beforeEach(() => {
    error = vi.spyOn(console, "error");
    warn = vi.spyOn(console, "warn");
  });
  afterEach(() => {
    const messages = [...error.mock.calls, ...warn.mock.calls].map((call) => call.map(String).join(" "));
    error.mockRestore();
    warn.mockRestore();
    expect(messages).toEqual([]);
  });
}

/**
 * Render an integration
 *
 * Renders `<DatePicker>` with one library's parts, inside that library's
 * provider where it needs one.
 *
 * @param components - The library's slot map.
 * @param props - The component's props.
 * @param wrapper - The library's provider, for the libraries that have one.
 * @returns A user-event instance for driving the control.
 *
 * @example
 * ```tsx
 * const renderMuiDatePicker = (props: Partial<DatePickerProps> = {}) =>
 *   renderIntegration(muiDatePicker, props, Wrapper);
 * ```
 */
export function renderIntegration(
  components: Partial<DatePickerComponents>,
  props: Partial<DatePickerProps> = {},
  wrapper?: ComponentType<{ children: ReactNode }>,
) {
  const user = userEvent.setup();
  render(
    <DatePicker {...({ components, ...props } as DatePickerProps)} />,
    wrapper ? { wrapper } : undefined,
  );
  return user;
}

/**
 * Keeps focus on a picked day
 *
 * Registers the tests every library's `Day` must pass: picking a day by
 * keyboard or by click keeps the same element mounted and focused, so the
 * arrow keys keep working. A part that swaps its element as the day becomes
 * selected drops focus to `<body>`.
 *
 * @param renderPicker - Renders the picker with the library's parts.
 */
export function itKeepsFocusOnAPickedDay(
  renderPicker: (props?: Partial<DatePickerProps>) => ReturnType<typeof userEvent.setup>,
) {
  it("keeps the same day focused when Enter picks it, and the arrows keep moving", async () => {
    const user = renderPicker({ mode: "multiple" });
    await open(user);
    await user.keyboard("{ArrowRight}");
    const picked = day("2026-03-13");
    expect(document.activeElement).toBe(picked);

    await user.keyboard("{Enter}");

    expect(day("2026-03-13")).toHaveAttribute("data-selected");
    expect(day("2026-03-13")).toBe(picked);
    expect(document.activeElement).toBe(picked);
    await user.keyboard("{ArrowRight}");
    expect(focusedDate()).toBe("2026-03-14");
  });

  it("keeps the range end focused when a click picks it", async () => {
    const user = renderPicker({ mode: "range" });
    await open(user);
    await user.click(day("2026-03-16"));
    const end = day("2026-03-20");

    await user.click(end);

    expect(day("2026-03-20")).toBe(end);
    expect(day("2026-03-20")).toHaveAttribute("data-selected");
    expect(document.activeElement).toBe(end);
  });
}
