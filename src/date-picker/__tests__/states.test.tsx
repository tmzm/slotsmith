import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DatePickerComponents } from "../slots/types";
import { DatePicker } from "../DatePicker";
import {
  datesWith,
  day,
  freezeToday,
  isOpen,
  open,
  renderDatePicker,
  renderWithUser,
  shownMonth,
  trigger,
} from "./builders";

freezeToday();

const yearOptions = () =>
  Array.from(screen.getByRole("combobox", { name: "Year" }).querySelectorAll("option")).map((option) =>
    Number(option.value),
  );

describe("disabled", () => {
  it("cannot be opened or cleared", async () => {
    const { user } = renderDatePicker({ disabled: true, defaultValue: "2026-03-05" });

    await user.click(trigger());
    expect(isOpen()).toBe(false);
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
    expect(trigger().closest("[data-disabled]")).not.toBeNull();
  });
});

describe("clearing", () => {
  it("offers a clear control only when something is picked", () => {
    const { unmount } = renderDatePicker();
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
    unmount();

    renderDatePicker({ defaultValue: "2026-03-05" });
    expect(screen.getByRole("button", { name: "Clear date" })).toBeInTheDocument();
  });

  it("clears to null without opening the calendar", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ defaultValue: "2026-03-05", onChange });

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(trigger()).toHaveTextContent("Pick a date");
    expect(isOpen()).toBe(false);
  });

  it("clears a range to null", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "range", defaultValue: { from: "2026-03-05" }, onChange });

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("can be turned off", () => {
    renderDatePicker({ defaultValue: "2026-03-05", clearable: false });
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("does not open the calendar when Enter is pressed on the clear control", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-03-05" });

    screen.getByRole("button", { name: "Clear date" }).focus();
    await user.keyboard("{Enter}");

    expect(isOpen()).toBe(false);
  });
});

describe("bounds", () => {
  it("blocks the days outside minDate and maxDate", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ minDate: "2026-03-05", maxDate: "2026-03-25", onChange });
    await open(user);

    expect(day("2026-03-04")).toHaveAttribute("data-disabled");
    expect(day("2026-03-05")).not.toHaveAttribute("data-disabled");
    expect(day("2026-03-26")).toHaveAttribute("data-disabled");

    await user.click(day("2026-03-04"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not page past them", async () => {
    const { user } = renderDatePicker({ minDate: "2026-03-05", maxDate: "2026-04-10" });
    await open(user);

    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(shownMonth()).toBe("April 2026");
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("keeps the caption's month and year inside them", async () => {
    const { user } = renderDatePicker({ minDate: "2026-03-05", maxDate: "2027-06-10" });
    await open(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2027");
    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "11");

    expect(shownMonth()).toBe("June 2027");
  });

  it("offers the years between the bounds", async () => {
    const { user } = renderDatePicker({ minDate: "2024-01-01", maxDate: "2027-12-31" });
    await open(user);

    expect(yearOptions()).toEqual([2024, 2025, 2026, 2027]);
  });

  it("offers ten years either side of the shown year without bounds", async () => {
    const { user } = renderDatePicker({ defaultValue: "1990-05-01" });
    await open(user);

    const years = yearOptions();
    expect(years[0]).toBe(1980);
    expect(years.at(-1)).toBe(2000);
  });

  it("offers the years from one bound to ten past the shown year", async () => {
    const { user } = renderDatePicker({ minDate: "2020-01-01" });
    await open(user);

    const years = yearOptions();
    expect(years[0]).toBe(2020);
    expect(years.at(-1)).toBe(2036);
  });
});

describe("blocked dates", () => {
  it("blocks what the predicate rejects", async () => {
    const onChange = vi.fn();
    const weekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00`).getDay());
    const { user } = renderDatePicker({ disabledDates: weekend, onChange });
    await open(user);

    expect(day("2026-03-14")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-13")).not.toHaveAttribute("aria-disabled");

    await user.click(day("2026-03-14"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("presets", () => {
  it("applies a date preset and closes in single mode", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ onChange, presets: [{ label: "Tomorrow", value: "2026-03-13" }] });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Tomorrow" }));

    expect(onChange).toHaveBeenCalledWith("2026-03-13");
    expect(isOpen()).toBe(false);
  });

  it("applies a range preset and stays open in range mode", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({
      mode: "range",
      onChange,
      presets: [{ label: "Next week", value: { from: "2026-04-06", to: "2026-04-12" } }],
    });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(onChange).toHaveBeenCalledWith({ from: "2026-04-06", to: "2026-04-12" });
    expect(isOpen()).toBe(true);
    expect(shownMonth()).toBe("April 2026");
  });

  it("converts a preset to the mode's shape", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({
      mode: "multiple",
      onChange,
      presets: [{ label: "Long weekend", value: { from: "2026-03-13", to: "2026-03-15" } }],
    });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Long weekend" }));

    expect(onChange).toHaveBeenCalledWith(["2026-03-13", "2026-03-14", "2026-03-15"]);
  });

  it("shows today's month without picking it", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ defaultValue: "2025-01-10", onChange });
    await open(user);
    expect(shownMonth()).toBe("January 2025");

    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(shownMonth()).toBe("March 2026");
    expect(day("2026-03-12")).toHaveAttribute("tabindex", "0");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("closing on select", () => {
  it.each([
    ["single", true],
    ["multiple", false],
    ["range", false],
  ] as const)("defaults %s mode to closing: %s", async (mode, closes) => {
    const { user } = renderDatePicker({ mode } as never);
    await open(user);

    await user.click(day("2026-03-10"));
    /** A range needs its end before closing can even come up. */
    if (mode === "range") await user.click(day("2026-03-11"));

    expect(isOpen()).toBe(!closes);
  });

  it("can keep single mode open", async () => {
    const { user } = renderDatePicker({ closeOnSelect: false });
    await open(user);

    await user.click(day("2026-03-10"));

    expect(isOpen()).toBe(true);
    expect(datesWith("selected")).toEqual(["2026-03-10"]);
  });
});

describe("the popup", () => {
  it("closes on a pointer down outside, and not inside", async () => {
    const { user } = renderWithUser(
      <>
        <DatePicker />
        <p>Elsewhere</p>
      </>,
    );
    await open(user);

    fireEvent.pointerDown(day("2026-03-10"));
    expect(isOpen()).toBe(true);

    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(isOpen()).toBe(false);
  });

  it("can be controlled", async () => {
    const onOpenChange = vi.fn();
    const { user } = renderDatePicker({ open: true, onOpenChange });

    expect(isOpen()).toBe(true);
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(isOpen()).toBe(true);
  });

  it("marks neighbouring months' days and today", async () => {
    const { user } = renderDatePicker({ weekStartsOn: 0 });
    await open(user);

    expect(day("2026-03-01")).not.toHaveAttribute("data-outside");
    expect(day("2026-04-01")).toHaveAttribute("data-outside");
    expect(datesWith("today")).toEqual(["2026-03-12"]);
  });

  it("is positioned against the trigger without a portal", async () => {
    const { user } = renderDatePicker();
    const popup = await open(user);

    expect(popup.style.position).toBe("fixed");
    expect(trigger().closest(".sdp")).toContainElement(popup);
  });
});

describe("replacing parts", () => {
  it("renders a replacement with the props its slot promises", async () => {
    const DayContent: DatePickerComponents["DayContent"] = ({ day: cell, selected }) => (
      <span data-testid={`content-${cell.date}`}>{selected ? `[${cell.day}]` : cell.day}</span>
    );
    const { user } = renderDatePicker({ defaultValue: "2026-03-05", components: { DayContent } });
    await open(user);

    expect(screen.getByTestId("content-2026-03-05")).toHaveTextContent("[5]");
    expect(screen.getByTestId("content-2026-03-06")).toHaveTextContent("6");
  });

  it("keeps the fallback for a part passed as undefined", async () => {
    const { user } = renderDatePicker({ components: { Day: undefined } });
    await open(user);

    expect(day("2026-03-10")).toHaveClass("sdp__day");
  });

  it("merges slot props into the element parts", async () => {
    const { user } = renderDatePicker({
      slotProps: {
        popup: { className: "shadow" },
        day: (cell) => (cell.weekend ? { className: "weekend" } : {}),
      },
    });
    await open(user);

    expect(screen.getByRole("dialog")).toHaveClass("sdp__popup", "shadow");
    expect(day("2026-03-14")).toHaveClass("sdp__day", "weekend");
    expect(day("2026-03-13")).not.toHaveClass("weekend");
  });
});
