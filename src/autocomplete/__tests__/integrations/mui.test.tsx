import { createTheme, ThemeProvider } from "@mui/material/styles";
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
import { muiAutocomplete } from "./mui/components";
import { failOnReactWarnings, itShowsTheInvalidState, removeControl, renderIntegration, stubBrowserApis, tagLabels } from "./shared";

/**
 * MUI wrapper
 *
 * `ThemeProvider` with a default theme.
 */
const theme = createTheme();
const Wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;

/**
 * Render MUI autocomplete
 *
 * `<Autocomplete>` with MUI v7 parts inside `ThemeProvider`.
 *
 * @param props - Overrides for the component's props.
 * @returns A user-event instance.
 */
const renderMuiAutocomplete = (props: Partial<AutocompleteProps<Brand>> = {}) =>
  renderIntegration(muiAutocomplete, props, Wrapper);

beforeAll(stubBrowserApis);

describe("MUI v7", () => {
  failOnReactWarnings();
  itShowsTheInvalidState(renderMuiAutocomplete, (trigger) => expect(trigger).toHaveClass("Mui-error"));

  it("renders the popup with MUI's primitives", async () => {
    const user = renderMuiAutocomplete();
    await open(user);

    expect(listbox()).toHaveClass("MuiList-root");
    expect(listbox().closest(".MuiPaper-root")).not.toBeNull();
    expect(searchBox().closest(".MuiInputBase-root")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveClass("MuiMenuItem-root");
    expect(options()).toHaveLength(BRANDS.length);
  });

  it("picks a value from a MenuItem and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderMuiAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Cassina"));

    expect(onChange).toHaveBeenCalledWith("b3", BRANDS[2]);
    expect(trigger()).toHaveTextContent("Cassina");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("toggles several values and renders them as Chips", async () => {
    const onChange = vi.fn();
    const user = renderMuiAutocomplete({ multiple: true, onChange });

    await open(user);
    await user.click(optionNamed("Aalto"));
    await user.click(optionNamed("Dux"));

    expect(onChange).toHaveBeenLastCalledWith(["b1", "b4"], [BRANDS[0], BRANDS[3]]);
    expect(tagLabels()).toEqual(["Aalto", "Dux"]);
    expect(removeControl("Aalto").closest(".MuiChip-root")).not.toBeNull();
    expect(optionNamed("Aalto")).toHaveAttribute("aria-selected", "true");

    await user.click(removeControl("Aalto"));

    expect(onChange).toHaveBeenLastCalledWith(["b4"], [BRANDS[3]]);
    expect(tagLabels()).toEqual(["Dux"]);
  });

  it("refuses a disabled option", async () => {
    const onChange = vi.fn();
    const user = renderMuiAutocomplete({ onChange });

    await open(user);
    await user.click(optionNamed("Gubi"));

    expect(onChange).not.toHaveBeenCalled();
    expect(optionNamed("Gubi")).toHaveAttribute("aria-disabled", "true");
    expect(listbox()).toBeInTheDocument();
  });

  it("picks with the keyboard through InputBase", async () => {
    const onChange = vi.fn();
    const user = renderMuiAutocomplete({ onChange });

    await user.click(trigger());
    expect(searchBox()).toHaveFocus();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("b1", BRANDS[0]);
    expect(trigger()).toHaveTextContent("Aalto");
  });

  it("shows the empty state when the search matches nothing", async () => {
    const user = renderMuiAutocomplete();

    await open(user);
    await user.type(searchBox(), "zzz");

    expect(options()).toHaveLength(0);
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("retries from the error state", async () => {
    const onRetry = vi.fn();
    const user = renderMuiAutocomplete({ error: "Could not load brands", onRetry });

    await open(user);
    expect(screen.getByText("Could not load brands")).toBeInTheDocument();
    expect(options()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
