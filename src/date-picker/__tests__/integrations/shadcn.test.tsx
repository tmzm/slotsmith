import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger, at } from "../builders";
import { shadcnDatePicker } from "./shadcn/components";
import { failOnReactWarnings, itKeepsFocusOnAPickedDay, itTypesADate, itShowsTheInvalidState, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Render shadcn date picker
 *
 * `<DatePicker trigger="button">` with shadcn/ui parts. Tailwind needs no provider.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderShadcnDatePicker = (props: Partial<DatePickerProps> = {}) =>
  renderIntegration(shadcnDatePicker, props);

beforeAll(stubBrowserApis);
freezeToday();

describe("shadcn/ui", () => {
  failOnReactWarnings();
  itShowsTheInvalidState(renderShadcnDatePicker, (trigger) => expect(trigger).toHaveClass("aria-invalid:border-destructive"));
  itKeepsFocusOnAPickedDay(renderShadcnDatePicker);
  itTypesADate(renderShadcnDatePicker);

  it("renders the calendar with shadcn's classes on the same DOM nodes", async () => {
    const user = renderShadcnDatePicker();
    // shadcn's InputGroup frame, not a hand-styled div.
    expect(trigger()).toHaveAttribute("data-slot", "input-group");

    await open(user);

    expect(dialog()).toHaveAttribute("data-slot", "popover-content");
    // shadcn's own Popover, portaled out of the picker.
    expect(dialog().closest("[data-radix-popper-content-wrapper]")).not.toBeNull();
    expect(dialog().closest(".sdp")).toBeNull();
    expect(day("2026-03-12")).toHaveClass("size-8");
    expect(day("2026-03-12")).not.toHaveClass("sdp__day");
    // shadcn's own components, not hand-made HTML.
    expect(day("2026-03-12")).toHaveAttribute("data-slot", "button");
    expect(screen.getByRole("button", { name: "Next month" })).toHaveAttribute("data-slot", "button");
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveAttribute("data-slot", "native-select");
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveAttribute("data-slot", "native-select");
  });

  it("picks a date and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith(at("2026-03-20"));
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(isOpen()).toBe(false);
  });

  it("moves through the grid with the keyboard", async () => {
    const user = renderShadcnDatePicker();
    await open(user);

    await user.keyboard("{End}{PageDown}");

    expect(focusedDate()).toBe("2026-04-14");
    expect(shownMonth()).toBe("April 2026");
  });

  it("picks a range and previews it on the way", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ mode: "range", onChange });
    await open(user);

    await user.click(day("2026-03-10"));
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(datesWith("in-preview")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);

    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith({ from: at("2026-03-10"), to: at("2026-03-12") });
    expect(datesWith("in-range")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
  });

  it("refuses a blocked day", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ onChange, disabledDates: (date) => date === at("2026-03-13") });
    await open(user);

    await user.click(day("2026-03-13"));

    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-03-13")).toHaveAttribute("data-disabled");
  });

  it("toggles several dates", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ mode: "multiple", onChange });
    await open(user);

    await user.click(day("2026-03-03"));
    await user.click(day("2026-03-01"));

    expect(onChange).toHaveBeenLastCalledWith([at("2026-03-01"), at("2026-03-03")]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
