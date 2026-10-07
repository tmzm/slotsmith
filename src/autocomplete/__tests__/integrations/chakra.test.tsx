import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { AutocompleteProps } from "../../index";
import {
  BRANDS,
  listbox,
  open,
  optionNamed,
  options,
  searchBox,
  trigger,
  type Brand,
} from "../builders";
import { chakraAutocomplete } from "./chakra/components";
import { failOnReactWarnings, itShowsTheInvalidState, removeControl, renderIntegration, stubBrowserApis, tagLabels } from "./shared";

/**
 * Chakra wrapper
 *
 * `ChakraProvider` with the default system.
 */
const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
);

/**
 * Render Chakra autocomplete
 *
 * `<Autocomplete>` with Chakra UI v3 parts inside `ChakraProvider`.
 *
 * @param props - Overrides for the component's props.
 * @returns A user-event instance.
 */
const renderChakraAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderIntegration(chakraAutocomplete, props, Wrapper);

/**
 * Invalid style
 *
 * jsdom does not resolve Chakra's `_invalid` condition, so the test reads the
 * rule Chakra generated for the element's own class instead.
 *
 * @param element - An element styled through Chakra's style props.
 * @returns The declarations of its `_invalid` rule, or `""`.
 */
const invalidStyle = (element: HTMLElement) =>
  [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .map((rule) => rule.cssText)
    .find((text) => [...element.classList].some((name) => text.startsWith(`.${name}:is([data-invalid]`))) ?? "";

beforeAll(stubBrowserApis);

describe("Chakra UI v3", () => {
  failOnReactWarnings();
  itShowsTheInvalidState(renderChakraAutocomplete, (trigger) =>
    expect(invalidStyle(trigger)).toContain("border-color: var(--chakra-colors-border-error)"),
  );

  it("renders the popup with Chakra's parts", async () => {
    const user = renderChakraAutocomplete();
    await open(user);

    expect(listbox()).toHaveClass("chakra-list__root");
    expect(searchBox()).toHaveClass("chakra-input");
    expect(optionNamed("Aalto")).toHaveClass("chakra-list__item");
    expect(options()).toHaveLength(BRANDS.length);
  });

  it("picks a value from a List.Item and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderChakraAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(trigger()).toHaveTextContent("Cassina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("toggles several values and renders them as Tags", async () => {
    const onChange = vi.fn();
    const user = renderChakraAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(tagLabels()).toEqual(["Aalto", "Dux"]);
    expect(removeControl("Aalto").closest(".chakra-tag__root")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "true");

    await user.click(removeControl("Aalto"));

    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
    expect(tagLabels()).toEqual(["Dux"]);
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const user = renderChakraAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(listbox()).toBeInTheDocument();
  });

  it("picks with the keyboard through Chakra's Input", async () => {
    const onChange = vi.fn();
    const user = renderChakraAutocomplete({ onChange });

    await user.click(trigger());
    expect(searchBox()).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("shows Chakra's EmptyState when the search matches nothing", async () => {
    const user = renderChakraAutocomplete();

    await open(user);
    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(document.querySelector(".chakra-empty-state__root")).not.toBeNull();
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderChakraAutocomplete({ error: "Could not load brands", onRetry });

    await open(user);
    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
