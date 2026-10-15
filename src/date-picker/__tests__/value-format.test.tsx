import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { day, open, renderDatePicker, trigger } from "./builders";

afterEach(() => {
  vi.useRealTimers();
});

/** Today is March 12th 2026 at 20:00 UTC: already the 13th in Tokyo, still the 12th in Los Angeles. */
const lateOnTheTwelfth = () => vi.useFakeTimers({ now: Date.UTC(2026, 2, 12, 20), toFake: ["Date"] });

describe("valueFormat", () => {
  it("reads and writes the value in a pattern", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    const { user } = renderDatePicker({ valueFormat: "DD/MM/YYYY", value: "05/03/2026", onChange });
    expect(trigger()).toHaveTextContent("Mar 5, 2026");
    await open(user);
    expect(day("2026-03-05")).toHaveAttribute("data-selected");
    await user.click(day("2026-03-20"));
    expect(onChange).toHaveBeenCalledWith("20/03/2026");
  });

  it("reads minDate, maxDate and the presets, and asks disabledDates, in the same format", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    const disabledDates = vi.fn((date: string) => date === "18/03/2026");
    const { user } = renderDatePicker({
      valueFormat: "DD/MM/YYYY",
      defaultValue: "15/03/2026",
      minDate: "10/03/2026",
      maxDate: "25/03/2026",
      disabledDates,
      presets: [{ label: "Pay day", value: "24/03/2026" }],
      onChange,
    });
    await open(user);
    expect(day("2026-03-09")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-26")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-18")).toHaveAttribute("aria-disabled", "true");
    expect(disabledDates).toHaveBeenCalledWith("18/03/2026");
    await user.click(screen.getByRole("button", { name: "Pay day" }));
    expect(onChange).toHaveBeenCalledWith("24/03/2026");
  });

  it("writes a range's ends in the format", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "range", valueFormat: "YYYY.MM.DD", onChange });
    await open(user);
    await user.click(day("2026-03-03"));
    await user.click(day("2026-03-06"));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026.03.03", to: "2026.03.06" });
  });

  it("writes several days in the format", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    const { user } = renderDatePicker({ mode: "multiple", valueFormat: "M/D/YYYY", onChange });
    await open(user);
    await user.click(day("2026-03-03"));
    expect(onChange).toHaveBeenLastCalledWith(["3/3/2026"]);
  });

  it("takes a codec of the app's own", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    const compact = { format: (date: string) => date.replaceAll("-", ""), parse: (text: string) => `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` };
    const { user } = renderDatePicker({ valueFormat: compact, value: "20260301", onChange });
    expect(trigger()).toHaveTextContent("Mar 1, 2026");
    await open(user);
    await user.click(day("2026-03-02"));
    expect(onChange).toHaveBeenCalledWith("20260302");
  });
});

describe("timeZone", () => {
  it("marks today in the time zone", async () => {
    lateOnTheTwelfth();
    const { user } = renderDatePicker({ timeZone: "Asia/Tokyo" });
    await open(user);
    expect(day("2026-03-13")).toHaveAttribute("data-today");
    expect(day("2026-03-12")).not.toHaveAttribute("data-today");
  });

  it("follows another zone where it is still the day before", async () => {
    lateOnTheTwelfth();
    const { user } = renderDatePicker({ timeZone: "America/Los_Angeles" });
    await open(user);
    expect(day("2026-03-12")).toHaveAttribute("data-today");
  });

  it("writes a picked day as the instant it starts in the zone, and reads an instant as its day there", async () => {
    lateOnTheTwelfth();
    const onChange = vi.fn();
    // 20:00 UTC on the 12th is the 13th in Tokyo.
    const { user } = renderDatePicker({ timeZone: "Asia/Tokyo", valueFormat: "iso-datetime", value: "2026-03-12T20:00:00Z", onChange });
    expect(trigger()).toHaveTextContent("Mar 13, 2026");
    await open(user);
    await user.click(day("2026-03-20"));
    expect(onChange).toHaveBeenCalledWith("2026-03-20T00:00:00+09:00");
  });
});
