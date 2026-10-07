import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
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

/**
 * Shows the invalid state
 *
 * Registers the test every library's `Trigger` must pass: with `invalid` the
 * combobox carries `aria-invalid` and the search box does not, and the
 * library's own error style appears, open or closed.
 *
 * @param renderAutocomplete - Renders the autocomplete with the library's parts.
 * @param expectErrorStyle - Asserts the library's error marker on the trigger.
 */
export function itShowsTheInvalidState(
  renderAutocomplete: (props?: Partial<AutocompleteProps<Brand>>) => ReturnType<typeof userEvent.setup>,
  expectErrorStyle: (trigger: HTMLElement) => void,
) {
  it("shows the library's error style on an invalid trigger", async () => {
    const user = renderAutocomplete({ invalid: true });
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expectErrorStyle(trigger());

    await user.click(trigger());
    expect(screen.getByRole("searchbox")).not.toHaveAttribute("aria-invalid");
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expectErrorStyle(trigger());
  });
}

/**
 * Searches in the trigger
 *
 * Registers the tests every library's `Trigger`, `TriggerInput` and `Toggle`
 * must pass with `searchIn="trigger"`: the library's input is the combobox
 * and keeps focus, typing filters, the keyboard picks, the picked label
 * shows in the input, tags sit before it and Backspace removes the last,
 * the toggle opens without taking focus, and an invalid value marks the
 * input and shows the library's error style on the field.
 *
 * @param renderAutocomplete - Renders the autocomplete with the library's parts.
 * @param expectLibraryParts - Asserts the library's markers on the field, the input and the toggle.
 * @param expectErrorStyle - Asserts the library's error marker on the field.
 */
export function itSearchesInTheTrigger(
  renderAutocomplete: (props?: Partial<AutocompleteProps<Brand>>) => ReturnType<typeof userEvent.setup>,
  expectLibraryParts: (parts: { field: HTMLElement; input: HTMLElement; toggle: HTMLElement }) => void,
  expectErrorStyle: (field: HTMLElement, input: HTMLElement) => void,
) {
  const inTrigger = (props: Partial<AutocompleteProps<Brand>> = {}) =>
    renderAutocomplete({ searchIn: "trigger", "aria-label": "Brand", ...props } as Partial<AutocompleteProps<Brand>>);
  const input = () => screen.getByRole("combobox") as HTMLInputElement;
  const field = () => input().closest<HTMLElement>('[data-search-in="trigger"]')!;
  const toggle = () => within(field()).getByRole("button", { name: "Show options" });

  it("searches from the library's input inside the trigger", async () => {
    const onChange = vi.fn();
    const user = inTrigger({ onChange, defaultValue: "b4" });

    expect(input().tagName).toBe("INPUT");
    expect(input()).toHaveValue("Dux");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expectLibraryParts({ field: field(), input: input(), toggle: toggle() });

    await user.click(input());
    await user.keyboard("ka");
    expect(screen.getAllByRole("option").map((option) => option.textContent?.trim())).toEqual(["Kartell"]);
    expect(input()).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("b10", BRANDS[9]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input()).toHaveValue("Kartell");
    expect(input()).toHaveFocus();
  });

  it("opens from the toggle and picks with the pointer, keeping focus in the input", async () => {
    const onChange = vi.fn();
    const user = inTrigger({ onChange });

    expect(toggle()).toHaveAttribute("tabindex", "-1");
    await user.click(toggle());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(input()).toHaveFocus();
    expect(input()).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("option", { name: "Cassina" }));
    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(input()).toHaveFocus();
  });

  it("puts the tags before the input and removes the last on Backspace", async () => {
    const onChange = vi.fn();
    const user = inTrigger({ multiple: true, defaultValue: ["b1", "b2"], onChange });

    const tags = within(field()).getAllByRole("button", { name: /^Remove / });
    expect(tags.map((button) => button.getAttribute("aria-label"))).toEqual(["Remove Aalto", "Remove Boråstapeter"]);
    expect(tags[0]!.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(input());
    await user.keyboard("{Backspace}");
    expect(onChange).toHaveBeenLastCalledWith(["b1"], [BRANDS[0]]);

    await user.click(within(field()).getByRole("button", { name: "Remove Aalto" }));
    expect(onChange).toHaveBeenLastCalledWith([], []);
    expect(input()).toHaveFocus();
  });

  it("marks the input invalid and shows the library's error style on the field", async () => {
    const user = inTrigger({ invalid: true });

    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAttribute("data-invalid");
    expectErrorStyle(field(), input());
    await user.click(input());
    expectErrorStyle(field(), input());
  });
}

/** Where each shared brand is made, so the integration tests can group them. */
const COUNTRY: Record<string, string> = {
  b1: "Finland",
  b2: "Sweden",
  b3: "Italy",
  b4: "Sweden",
  b5: "Norway",
  b6: "Denmark",
  b7: "Denmark",
  b8: "Denmark",
  b9: "Finland",
  b10: "Italy",
};

/** Groups the shared brands by country, interleaved so grouping has to gather them. */
export const byCountry = (brand: Brand) => COUNTRY[brand.id];

/**
 * Renders the groups
 *
 * Registers the test every library's `Group`, `GroupLabel` and `Separator`
 * must pass: each group is a `role="group"` named by its label, in order of
 * first appearance; the keyboard crosses groups in the order shown; the
 * separators are hidden and never focusable; and the library's own parts
 * render them.
 *
 * @param renderAutocomplete - Renders the autocomplete with the library's parts.
 * @param expectLibraryParts - Asserts the library's markers on a group label and a separator.
 */
export function itRendersGroups(
  renderAutocomplete: (props?: Partial<AutocompleteProps<Brand>>) => ReturnType<typeof userEvent.setup>,
  expectLibraryParts: (parts: { label: HTMLElement; separator: Element }) => void,
) {
  it("renders option groups with the library's parts", async () => {
    const onChange = vi.fn();
    const user = renderAutocomplete({ getOptionGroup: byCountry, onChange });
    await user.click(trigger());
    const listbox = screen.getByRole("listbox");

    const groups = within(listbox).getAllByRole("group");
    const names = ["Finland", "Sweden", "Italy", "Norway", "Denmark"];
    expect(groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent)).toEqual(names);
    for (const name of names) expect(within(listbox).getByRole("group", { name })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Sweden" })).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Boråstapeter",
      "Dux",
    ]);

    const separators = listbox.querySelectorAll('[aria-hidden="true"][role="none"]');
    expect(separators).toHaveLength(names.length - 1);
    separators.forEach((separator) => {
      expect(separator.querySelector("[tabindex], button, input")).toBeNull();
      expect(separator).not.toHaveAttribute("tabindex");
    });

    const label = document.getElementById(groups[0]!.getAttribute("aria-labelledby")!)!;
    expect(label).toHaveAttribute("role", "presentation");
    expectLibraryParts({ label, separator: separators[0]! });

    /** Aalto and Iittala (Finland), then Boråstapeter (Sweden). */
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    const active = document.getElementById(screen.getByRole("searchbox").getAttribute("aria-activedescendant")!);
    expect(active).toHaveTextContent("Boråstapeter");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("b2", BRANDS[1]);
  });
}
