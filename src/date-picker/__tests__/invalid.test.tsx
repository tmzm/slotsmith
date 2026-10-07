import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDatePicker } from "../core/useDatePicker";
import { freezeToday, renderDatePicker, trigger } from "./builders";

freezeToday();

describe("the invalid state", () => {
  it("is off by default", () => {
    const { container } = renderDatePicker();

    expect(trigger()).not.toHaveAttribute("aria-invalid");
    expect(container.querySelector("[data-invalid]")).toBeNull();
  });

  it("marks the combobox invalid and flags the root and trigger for styling", () => {
    const { container } = renderDatePicker({ invalid: true });

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expect(trigger()).toHaveAttribute("data-invalid");
    expect(container.querySelector(".sdp")).toHaveAttribute("data-invalid");
  });

  it("points the combobox at the error message", () => {
    renderDatePicker({
      invalid: true,
      "aria-errormessage": "due-error",
      "aria-describedby": "due-hint",
    } as never);

    expect(trigger()).toHaveAttribute("aria-errormessage", "due-error");
    expect(trigger()).toHaveAttribute("aria-describedby", "due-hint");
    expect(trigger().parentElement).not.toHaveAttribute("aria-errormessage");
  });

  it("is exposed by the headless hook", () => {
    const { result } = renderHook(() => useDatePicker({ invalid: true }));

    expect(result.current.invalid).toBe(true);
    expect(result.current.getTriggerProps()["aria-invalid"]).toBe(true);
    expect(result.current.getRootProps()["data-invalid"]).toBe(true);
  });
});
