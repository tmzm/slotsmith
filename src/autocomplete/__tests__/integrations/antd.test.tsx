import { ConfigProvider, theme } from "antd";
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
import { antdComponents } from "./antd/components";
import { failOnReactWarnings, removeControl, renderIntegration, stubBrowserApis, tagLabels } from "./shared";

/**
 * Ant Design wrapper
 *
 * `ConfigProvider` with the default theme.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;

/** The default theme's tokens, to check the colours the parts paint with. */
const token = theme.getDesignToken();

/**
 * CSS colour
 *
 * @param color - A token colour, in any CSS syntax.
 * @returns The same colour as the DOM reports it.
 */
function cssColor(color: string) {
  const probe = document.createElement("i");
  probe.style.backgroundColor = color;
  return probe.style.backgroundColor;
}

/**
 * Render Ant Design autocomplete
 *
 * `<Autocomplete>` with Ant Design v6 parts inside `ConfigProvider`.
 *
 * @param props - Overrides for the component's props.
 * @returns A user-event instance.
 */
const renderAntdAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderIntegration(antdComponents, props, Wrapper);

beforeAll(stubBrowserApis);

describe("Ant Design v6", () => {
  failOnReactWarnings();

  it("renders the popup with Ant's primitives and tokens", async () => {
    const user = renderAntdAutocomplete();
    await open(user);

    expect(trigger().style.borderColor).toBe(cssColor(token.colorPrimary));
    expect(searchBox()).toHaveClass("ant-input");
    expect(listbox().parentElement!.style.backgroundColor).toBe(cssColor(token.colorBgElevated));
    expect(options()).toHaveLength(BRANDS.length);
  });

  it("merges a caller's style into the search box instead of replacing it", async () => {
    const user = renderAntdAutocomplete({ slotProps: { search: { style: { minWidth: 120 } } } });
    await open(user);

    const field = searchBox().closest<HTMLElement>(".ant-input-affix-wrapper")!;
    expect(field.style.minWidth).toBe("120px");
    expect(field.style.borderRadius).toBe("0px");
    expect(field.style.borderBottomColor).toBe(cssColor(token.colorSplit));
  });

  it("picks a value and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderAntdAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(trigger()).toHaveTextContent("Cassina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("toggles several values and renders them as Tags", async () => {
    const onChange = vi.fn();
    const user = renderAntdAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(tagLabels()).toEqual(["Aalto", "Dux"]);
    expect(removeControl("Aalto").closest(".ant-tag")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "true");
    expect(optionNamed("Aalto").style.backgroundColor).toBe(cssColor(token.controlItemBgActive));

    await user.click(removeControl("Aalto"));

    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
    expect(tagLabels()).toEqual(["Dux"]);
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const user = renderAntdAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(optionNamed("Gubi").style.color).toBe(cssColor(token.colorTextDisabled));
    expect(listbox()).toBeInTheDocument();
  });

  it("picks with the keyboard through Ant's Input", async () => {
    const onChange = vi.fn();
    const user = renderAntdAutocomplete({ onChange });

    await user.click(trigger());
    expect(searchBox()).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(optionNamed("Aalto").style.backgroundColor).toBe(cssColor(token.controlItemBgHover));
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("shows Ant's Empty when the search matches nothing", async () => {
    const user = renderAntdAutocomplete();

    await open(user);
    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(screen.getByText("No results").closest(".ant-empty")).not.toBeNull();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderAntdAutocomplete({ error: "Could not load brands", onRetry });

    await open(user);
    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);

    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveClass("ant-btn");
    await user.click(retry);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("clears from an Ant Button without opening", async () => {
    const onChange = vi.fn();
    const user = renderAntdAutocomplete({ defaultValue: "b2", onChange });

    const clear = screen.getByRole("button", { name: "Clear selection" });
    expect(clear).toHaveClass("ant-btn");
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith(null, undefined);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
