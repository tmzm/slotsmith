import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DateRange } from "../core/types";
import { DatePicker } from "../DatePicker";
import {
  datesWith,
  day,
  focusedDate,
  freezeToday,
  isOpen,
  open,
  renderDatePicker,
  renderWithUser,
  trigger,
} from "./builders";

freezeToday();

describe("single mode", () => {
  it("picks a date as a YYYY-MM-DD string and closes", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(trigger()).toHaveFocus();
  });

  it("stays uncontrolled until a value is passed", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-03-05" });
    expect(trigger()).toHaveTextContent("Mar 5, 2026");

    await open(user);
    await user.click(day("2026-03-06"));

    expect(trigger()).toHaveTextContent("Mar 6, 2026");
  });

  it("shows only what a controlled value says", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ value: "2026-03-05", onChange });

    await open(user);
    await user.click(day("2026-03-06"));

    expect(onChange).toHaveBeenCalledWith("2026-03-06");
    expect(trigger()).toHaveTextContent("Mar 5, 2026");
  });

  it("marks the picked day selected", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-03-05" });
    await open(user);

    expect(datesWith("selected")).toEqual(["2026-03-05"]);
  });

  it("opens on the month of the picked date", async () => {
    const { user } = renderDatePicker({ defaultValue: "2025-11-20" });
    await open(user);

    expect(day("2025-11-20")).toHaveAttribute("data-selected");
    expect(day("2025-11-01")).not.toHaveAttribute("data-outside");
  });
});

describe("multiple mode", () => {
  it("toggles dates, keeps them sorted and stays open", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "multiple", onChange });

    await open(user);
    await user.click(day("2026-03-20"));
    await user.click(day("2026-03-04"));

    expect(onChange).toHaveBeenLastCalledWith(["2026-03-04", "2026-03-20"]);
    expect(isOpen()).toBe(true);

    await user.click(day("2026-03-20"));
    expect(onChange).toHaveBeenLastCalledWith(["2026-03-04"]);
  });

  it("names two dates on the trigger and counts more", async () => {
    const { user } = renderDatePicker({ mode: "multiple", defaultValue: ["2026-03-04", "2026-03-02"] });
    expect(trigger()).toHaveTextContent("Mar 2, 2026, Mar 4, 2026");

    await open(user);
    await user.click(day("2026-03-09"));

    expect(trigger()).toHaveTextContent("3 dates selected");
  });

  it("clears to an empty array, never null", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "multiple", defaultValue: ["2026-03-04"], onChange });

    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("range mode", () => {
  it("sets the start with the first click and the end with the second", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "range", onChange });

    await open(user);
    await user.click(day("2026-03-10"));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-10" });
    expect(trigger()).toHaveTextContent("Mar 10, 2026 — …");

    await user.click(day("2026-03-14"));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-10", to: "2026-03-14" });
    expect(trigger()).toHaveTextContent("Mar 10, 2026 — Mar 14, 2026");
  });

  it("stays open once the range is complete, unless asked to close", async () => {
    const { user, unmount } = renderDatePicker({ mode: "range" });
    await open(user);
    await user.click(day("2026-03-10"));
    await user.click(day("2026-03-14"));
    expect(isOpen()).toBe(true);
    unmount();

    const closing = renderDatePicker({ mode: "range", closeOnSelect: true });
    await open(closing.user);
    await closing.user.click(day("2026-03-10"));
    expect(isOpen()).toBe(true);
    await closing.user.click(day("2026-03-14"));
    expect(isOpen()).toBe(false);
  });

  it("marks the band and both ends", async () => {
    const { user } = renderDatePicker({ mode: "range", defaultValue: { from: "2026-03-10", to: "2026-03-13" } });
    await open(user);

    expect(datesWith("in-range")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]);
    expect(datesWith("range-start")).toEqual(["2026-03-10"]);
    expect(datesWith("range-end")).toEqual(["2026-03-13"]);
    expect(datesWith("selected")).toEqual(["2026-03-10", "2026-03-13"]);
  });

  it("restarts the range from a click before its start", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "range", onChange, defaultValue: { from: "2026-03-10" } });

    await open(user);
    await user.click(day("2026-03-05"));

    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-05" });
  });

  it("starts a new range from a click after a complete one", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({
      mode: "range",
      onChange,
      defaultValue: { from: "2026-03-10", to: "2026-03-12" },
    });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-20" });
  });

  it("accepts a one-day range", async () => {
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "range", onChange });

    await open(user);
    await user.click(day("2026-03-10"));
    await user.click(day("2026-03-10"));

    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-03-10", to: "2026-03-10" });
  });

  it("previews the band up to the hovered day while the end is unset", async () => {
    const { user } = renderDatePicker({ mode: "range", defaultValue: { from: "2026-03-10" } });
    await open(user);

    fireEvent.pointerEnter(day("2026-03-13"));
    expect(datesWith("in-preview")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]);

    /** Before the start, a click would restart the range, so there is nothing to preview. */
    fireEvent.pointerEnter(day("2026-03-08"));
    expect(datesWith("in-preview")).toEqual([]);
  });

  it("previews up to the focused day for keyboard users", async () => {
    const { user } = renderDatePicker({ mode: "range", defaultValue: { from: "2026-03-10" } });
    await open(user);
    expect(focusedDate()).toBe("2026-03-10");

    await user.keyboard("{ArrowRight}{ArrowRight}");

    expect(datesWith("in-preview")).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
  });

  it("drops the preview once the range is complete", async () => {
    const { user } = renderDatePicker({ mode: "range", defaultValue: { from: "2026-03-10" } });
    await open(user);

    fireEvent.pointerEnter(day("2026-03-13"));
    await user.click(day("2026-03-13"));

    expect(datesWith("in-preview")).toEqual([]);
    expect(datesWith("in-range")).toHaveLength(4);
  });

  it("narrows onChange to a range at the call site", async () => {
    function Stay() {
      const [stay, setStay] = useState<DateRange | null>(null);
      return (
        <>
          <DatePicker mode="range" value={stay} onChange={setStay} />
          <output>{stay?.to ?? "open"}</output>
        </>
      );
    }
    const { user } = renderWithUser(<Stay />);

    await open(user);
    await user.click(day("2026-03-10"));
    await user.click(day("2026-03-11"));

    expect(screen.getByRole("status")).toHaveTextContent("2026-03-11");
  });
});

describe("the value's type follows the mode", () => {
  it("rejects a shape that belongs to another mode", () => {
    const typeOnly = () => (
      <>
        {/* @ts-expect-error — a single picker takes a date, not a list. */}
        <DatePicker value={["2026-03-10"]} />
        {/* @ts-expect-error — a range picker takes a range, not a date. */}
        <DatePicker mode="range" value="2026-03-10" />
        {/* @ts-expect-error — a multiple picker reports a list. */}
        <DatePicker mode="multiple" onChange={(value: string | null) => value} />
      </>
    );
    expect(typeOnly).toBeTypeOf("function");
  });
});
