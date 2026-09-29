import { Theme } from "@radix-ui/themes";
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
import { radixComponents } from "./radix/components";
import { failOnReactWarnings, removeControl, renderIntegration, stubBrowserApis, tagLabels } from "./shared";

/**
 * Radix Themes wrapper
 *
 * `Theme` with its default accent and appearance. jsdom loads no stylesheet,
 * so the colours the parts paint with are checked as the Radix variables
 * they name, which is what makes them follow the app's `Theme`.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <Theme>{children}</Theme>;

/**
 * Render Radix Themes autocomplete
 *
 * `<Autocomplete>` with Radix Themes parts inside `Theme`.
 *
 * @param props - Overrides for the component's props.
 * @returns A user-event instance.
 */
const renderRadixAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderIntegration(radixComponents, props, Wrapper);

beforeAll(stubBrowserApis);

describe("Radix Themes v3", () => {
  failOnReactWarnings();

  it("renders the popup with Radix primitives and variables", async () => {
    const user = renderRadixAutocomplete();
    await open(user);

    expect(trigger().style.outline).toContain("var(--focus-8)");
    expect(searchBox()).toHaveClass("rt-TextFieldInput");
    expect(listbox().parentElement!.style.backgroundColor).toBe("var(--color-panel-solid)");
    expect(options()).toHaveLength(BRANDS.length);
  });

  it("picks a value and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderRadixAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(trigger()).toHaveTextContent("Cassina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("toggles several values and renders them as Badges", async () => {
    const onChange = vi.fn();
    const user = renderRadixAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(tagLabels()).toEqual(["Aalto", "Dux"]);
    expect(removeControl("Aalto").closest(".rt-Badge")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "true");
    expect(optionNamed("Aalto").style.backgroundColor).toBe("var(--accent-a3)");

    await user.click(removeControl("Aalto"));

    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
    expect(tagLabels()).toEqual(["Dux"]);
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const user = renderRadixAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(optionNamed("Gubi").style.color).toBe("var(--gray-a8)");
    expect(listbox()).toBeInTheDocument();
  });

  it("picks with the keyboard through Radix's TextField", async () => {
    const onChange = vi.fn();
    const user = renderRadixAutocomplete({ onChange });

    await user.click(trigger());
    expect(searchBox()).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(optionNamed("Aalto").style.backgroundColor).toBe("var(--accent-a4)");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("shows the empty message when the search matches nothing", async () => {
    const user = renderRadixAutocomplete();

    await open(user);
    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(screen.getByText("No results")).toHaveClass("rt-Text");
  });

  it("shows a Spinner while loading", async () => {
    const user = renderRadixAutocomplete({ options: [], loading: true });

    await open(user);

    expect(listbox().querySelector(".rt-Spinner")).not.toBeNull();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderRadixAutocomplete({ error: "Could not load brands", onRetry });

    await open(user);
    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);

    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveClass("rt-Button");
    await user.click(retry);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("clears from an IconButton without opening", async () => {
    const onChange = vi.fn();
    const user = renderRadixAutocomplete({ defaultValue: "b2", onChange });

    const clear = screen.getByRole("button", { name: "Clear selection" });
    expect(clear).toHaveClass("rt-IconButton");
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith(null, undefined);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
