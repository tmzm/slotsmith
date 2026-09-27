import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger } from "../builders";
import { shadcnComponents } from "./shadcn/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Render shadcn date picker
 *
 * `<DatePicker>` with shadcn/ui parts. Tailwind needs no provider.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderShadcnDatePicker = (props: Partial<DatePickerProps> = {}) =>
  renderIntegration(shadcnComponents, props);

beforeAll(stubBrowserApis);
freezeToday();

describe("shadcn/ui", () => {
  failOnReactWarnings();

  it("renders the calendar with shadcn's classes on the same DOM nodes", async () => {
    const user = renderShadcnDatePicker();
    expect(trigger()).toHaveClass("border-input");

    await open(user);

    expect(dialog()).toHaveAttribute("data-slot", "popover-content");
    expect(day("2026-03-12")).toHaveClass("size-8");
    expect(day("2026-03-12")).not.toHaveClass("sdp__day");
  });

  it("picks a date and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
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

    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-10", to: "2026-03-12" });
    expect(datesWith("in-range")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
  });

  it("refuses a blocked day", async () => {
    const onChange = vi.fn();
    const user = renderShadcnDatePicker({ onChange, disabledDates: (date) => date === "2026-03-13" });
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

    expect(onChange).toHaveBeenLastCalledWith(["2026-03-01", "2026-03-03"]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
