import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, vi, type MockInstance } from "vitest";
import { Autocomplete, type AutocompleteComponents, type AutocompleteProps } from "../../index";
import { BRANDS, trigger, type Brand } from "../builders";

/**
 * Stub browser APIs
 *
 * jsdom lacks APIs that radix, Ark/zag (Chakra) and MUI call: pointer
 * capture, scrollIntoView, matchMedia and ResizeObserver.
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
 * Renders `<Autocomplete>` over the shared brand options with one library's
 * parts, inside that library's provider where it needs one.
 *
 * @param components - The library's slot map.
 * @param props - Overrides for the component's props.
 * @param wrapper - The library's provider, for the libraries that have one.
 * @returns A user-event instance for driving the control.
 *
 * @example
 * ```tsx
 * const renderMuiAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
 *   renderIntegration(muiAutocomplete, props, Wrapper);
 * ```
 */
export function renderIntegration(
  components: Partial<AutocompleteComponents<Brand>>,
  props: Partial<AutocompleteProps<Brand>> = {},
  wrapper?: ComponentType<{ children: ReactNode }>,
) {
  const user = userEvent.setup();
  const defaults = {
    options: BRANDS,
    getOptionLabel: (brand: Brand) => brand.name,
    optionDisabled: (brand: Brand) => !!brand.discontinued,
    components,
  };
  render(
    <Autocomplete<Brand> {...({ ...defaults, ...props } as AutocompleteProps<Brand>)} />,
    wrapper ? { wrapper } : undefined,
  );
  return user;
}

/**
 * Remove control
 *
 * The button that drops one value from its tag. Every library renders the tag
 * differently, so the tests reach for it by its accessible name rather than by
 * a class or a wrapper element.
 *
 * @param label - The tag's text.
 * @returns The remove button inside the trigger.
 */
export const removeControl = (label: string) =>
  within(trigger()).getByRole("button", { name: `Remove ${label}` });

/**
 * Tag labels
 *
 * @returns The label of every tag on the trigger, in order.
 */
export const tagLabels = () =>
  within(trigger())
    .queryAllByRole("button", { name: /^Remove / })
    .map((button) => button.getAttribute("aria-label")!.replace(/^Remove /, ""));
