import { createTheme, ThemeProvider } from "@mui/material/styles";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger } from "../builders";
import { muiDatePicker } from "./mui/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * MUI wrapper
 *
 * `ThemeProvider` with a default theme.
 */
const theme = createTheme();
const Wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;

/**
 * Render MUI date picker
 *
 * `<DatePicker>` with MUI v7 parts inside `ThemeProvider`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderMuiDatePicker = (props: Partial<DatePickerProps> = {}) =>
  renderIntegration(muiDatePicker, props, Wrapper);

beforeAll(stubBrowserApis);
freezeToday();

describe("MUI v7", () => {
  failOnReactWarnings();

  it("renders the calendar with MUI's primitives", async () => {
    const user = renderMuiDatePicker();
    await open(user);

    expect(dialog()).toHaveClass("MuiPaper-root");
    expect(day("2026-03-12")).toHaveClass("MuiIconButton-root");
    expect(screen.getByRole("button", { name: "Next month" })).toHaveClass("MuiIconButton-root");
    expect(screen.getByRole("combobox", { name: "Month" }).closest(".MuiInputBase-root")).not.toBeNull();
  });

  it("picks a date from an IconButton and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderMuiDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(isOpen()).toBe(false);
  });

  it("moves through the grid with the keyboard", async () => {
    const user = renderMuiDatePicker();
    await open(user);

    await user.keyboard("{ArrowRight}{ArrowDown}");

    expect(focusedDate()).toBe("2026-03-20");
    expect(day("2026-03-20")).toHaveAttribute("tabindex", "0");
  });

  it("applies a range preset from a Chip", async () => {
    const onChange = vi.fn();
    const user = renderMuiDatePicker({
      mode: "range",
      onChange,
      presets: [{ label: "Next week", value: { from: "2026-03-16", to: "2026-03-22" } }],
    });
    await open(user);

    const chip = screen.getByRole("button", { name: "Next week" });
    expect(chip).toHaveClass("MuiChip-root");
    await user.click(chip);

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-16", to: "2026-03-22" });
    expect(datesWith("in-range")).toHaveLength(7);
  });

  it("refuses a blocked day but keeps it focusable", async () => {
    const onChange = vi.fn();
    const user = renderMuiDatePicker({ onChange, minDate: "2026-03-10" });
    await open(user);

    await user.click(day("2026-03-09"));

    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-03-09")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-09")).not.toHaveClass("Mui-disabled");
  });

  it("changes the month from the native Select", async () => {
    const user = renderMuiDatePicker();
    await open(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "6");

    expect(shownMonth()).toBe("July 2026");
  });

  it("clears from an IconButton without opening", async () => {
    const onChange = vi.fn();
    const user = renderMuiDatePicker({ defaultValue: "2026-03-05", onChange });

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(isOpen()).toBe(false);
  });
});
