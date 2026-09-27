import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../DatePicker";
import {
  activeDay,
  day,
  focusedDate,
  freezeToday,
  isOpen,
  open,
  renderDatePicker,
  renderWithUser,
  shownMonth,
  trigger,
} from "./builders";

freezeToday();

describe("opening from the keyboard", () => {
  it.each(["{Enter}", " ", "{ArrowDown}"])("opens with %s on the trigger", async (key) => {
    const { user } = renderDatePicker();
    trigger().focus();

    await user.keyboard(key);

    expect(isOpen()).toBe(true);
  });

  it("focuses the picked day", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-04-22" });
    await open(user);

    expect(focusedDate()).toBe("2026-04-22");
  });

  it("focuses today when nothing is picked", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(focusedDate()).toBe("2026-03-12");
  });

  it("focuses the 1st of the shown month when today is out of bounds", async () => {
    const { user } = renderDatePicker({ minDate: "2026-06-01" });
    await open(user);

    expect(shownMonth()).toBe("June 2026");
    expect(focusedDate()).toBe("2026-06-01");
  });

  it("puts exactly one day in the tab order", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(activeDay()).toBe(day("2026-03-12"));
    expect(day("2026-03-13")).toHaveAttribute("tabindex", "-1");
  });
});

describe("moving through the grid", () => {
  it("moves a day with the side arrows and a week with the vertical ones", async () => {
    const { user } = renderDatePicker();
    await open(user);

    await user.keyboard("{ArrowRight}");
    expect(focusedDate()).toBe("2026-03-13");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(focusedDate()).toBe("2026-03-11");
    await user.keyboard("{ArrowDown}");
    expect(focusedDate()).toBe("2026-03-18");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(focusedDate()).toBe("2026-03-04");
  });

  it("keeps the tab stop on the focused day", async () => {
    const { user } = renderDatePicker();
    await open(user);

    await user.keyboard("{ArrowDown}");

    expect(activeDay()).toBe(day("2026-03-19"));
    expect(day("2026-03-12")).toHaveAttribute("tabindex", "-1");
  });

  it("goes to the ends of the week with Home and End", async () => {
    const { user } = renderDatePicker({ weekStartsOn: 1 });
    await open(user);

    await user.keyboard("{Home}");
    expect(focusedDate()).toBe("2026-03-09");
    await user.keyboard("{End}");
    expect(focusedDate()).toBe("2026-03-15");
  });

  it("pages a month with Page Up and Page Down, clamping the day", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-01-31" });
    await open(user);

    await user.keyboard("{PageDown}");
    expect(focusedDate()).toBe("2026-02-28");
    expect(shownMonth()).toBe("February 2026");

    await user.keyboard("{PageUp}");
    expect(focusedDate()).toBe("2026-01-28");
    expect(shownMonth()).toBe("January 2026");
  });

  it("pages a year with Shift", async () => {
    const { user } = renderDatePicker();
    await open(user);

    await user.keyboard("{Shift>}{PageDown}{/Shift}");
    expect(focusedDate()).toBe("2027-03-12");

    await user.keyboard("{Shift>}{PageUp}{PageUp}{/Shift}");
    expect(focusedDate()).toBe("2025-03-12");
  });

  it("turns the page when an arrow leaves the month", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-03-31" });
    await open(user);

    await user.keyboard("{ArrowRight}");

    expect(shownMonth()).toBe("April 2026");
    expect(focusedDate()).toBe("2026-04-01");
  });

  it("walks onto blocked days without skipping them", async () => {
    const weekend = (date: string) => ["2026-03-14", "2026-03-15"].includes(date);
    const { user } = renderDatePicker({ defaultValue: "2026-03-13", disabledDates: weekend });
    await open(user);

    await user.keyboard("{ArrowRight}");

    expect(focusedDate()).toBe("2026-03-14");
    expect(day("2026-03-14")).toHaveAttribute("aria-disabled", "true");
  });

  it("stops at minDate and maxDate", async () => {
    const { user } = renderDatePicker({ minDate: "2026-03-10", maxDate: "2026-03-20" });
    await open(user);

    await user.keyboard("{ArrowUp}");
    expect(focusedDate()).toBe("2026-03-10");
    await user.keyboard("{ArrowLeft}{PageUp}");
    expect(focusedDate()).toBe("2026-03-10");

    await user.keyboard("{PageDown}");
    expect(focusedDate()).toBe("2026-03-20");
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(focusedDate()).toBe("2026-03-20");
  });
});

describe("picking and leaving", () => {
  it.each(["{Enter}", " "])("picks the focused day with %s", async (key) => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ onChange });
    await open(user);

    await user.keyboard(`{ArrowRight}${key}`);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("2026-03-13");
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it("does not pick a blocked day", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ onChange, disabledDates: (date) => date === "2026-03-13" });
    await open(user);

    await user.keyboard("{ArrowRight}{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(isOpen()).toBe(true);
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    const { user } = renderDatePicker();
    await open(user);

    await user.keyboard("{ArrowDown}{Escape}");

    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it("closes with Escape from any control in the popup", async () => {
    const { user } = renderDatePicker();
    await open(user);

    screen.getByRole("button", { name: "Next month" }).focus();
    await user.keyboard("{Escape}");

    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it("reaches the header and footer with Tab, with only one stop in the grid", async () => {
    const { user } = renderDatePicker();
    await open(user);

    await user.tab();
    expect(screen.getByRole("button", { name: "Today" })).toHaveFocus();

    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Next month" })).toHaveFocus();
  });

  it("closes when focus leaves the control", async () => {
    const onBlur = vi.fn();
    const { user } = renderWithUser(
      <>
        <DatePicker onBlur={onBlur} />
        <button type="button">After</button>
      </>,
    );
    await open(user);

    await user.tab();
    expect(onBlur).not.toHaveBeenCalled();
    await user.tab();

    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    expect(isOpen()).toBe(false);
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("keeps focus on a nav control while it pages", async () => {
    const { user } = renderDatePicker();
    await open(user);

    const next = screen.getByRole("button", { name: "Next month" });
    await user.click(next);

    expect(shownMonth()).toBe("April 2026");
    expect(next).toHaveFocus();
    expect(activeDay()).toBe(day("2026-04-01"));
  });
});
