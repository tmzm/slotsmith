import { Theme } from "@radix-ui/themes";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger } from "../builders";
import { radixComponents } from "./radix/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Radix Themes wrapper
 *
 * `Theme` with its default accent and appearance. jsdom loads no stylesheet,
 * so the colours the parts paint with are checked as the Radix variables
 * they name, which is what makes them follow the app's `Theme`.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <Theme>{children}</Theme>;

/**
 * RTL wrapper
 *
 * `Theme` around a right-to-left page.
 */
const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <Theme>
    <div dir="rtl">{children}</div>
  </Theme>
);

/**
 * Render Radix Themes date picker
 *
 * `<DatePicker>` with Radix Themes parts inside `Theme`.
 *
 * @param props - The component's props.
 * @param wrapper - The provider around it.
 * @returns A user-event instance.
 */
const renderRadixDatePicker = (props: Partial<DatePickerProps> = {}, wrapper = Wrapper) =>
  renderIntegration(radixComponents, props, wrapper);

beforeAll(stubBrowserApis);
freezeToday();

describe("Radix Themes v3", () => {
  failOnReactWarnings();

  it("renders the calendar with Radix primitives", async () => {
    const user = renderRadixDatePicker();
    await open(user);

    expect(dialog()).not.toHaveClass("sdp__popup");
    expect(dialog().style.backgroundColor).toBe("var(--color-panel-solid)");
    expect(trigger().style.outline).toContain("var(--focus-8)");
    expect(day("2026-03-12")).toHaveClass("rt-Button");
    expect(day("2026-03-12").style.boxShadow).toContain("var(--accent-8)");
    expect(screen.getByRole("button", { name: "Next month" })).toHaveClass("rt-IconButton");
  });

  it("picks a date from a Button and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderRadixDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(isOpen()).toBe(false);

    await open(user);
    expect(day("2026-03-20")).toHaveClass("rt-variant-solid");
  });

  it("moves through the grid with the keyboard", async () => {
    const user = renderRadixDatePicker();
    await open(user);

    await user.keyboard("{ArrowRight}{ArrowDown}");

    expect(focusedDate()).toBe("2026-03-20");
    expect(day("2026-03-20")).toHaveAttribute("tabindex", "0");
  });

  it("applies a range preset from a Button and bands the range", async () => {
    const onChange = vi.fn();
    const user = renderRadixDatePicker({
      mode: "range",
      onChange,
      presets: [{ label: "Next week", value: { from: "2026-03-16", to: "2026-03-22" } }],
    });
    await open(user);

    const preset = screen.getByRole("button", { name: "Next week" });
    expect(preset).toHaveClass("rt-Button");
    await user.click(preset);

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-16", to: "2026-03-22" });
    expect(datesWith("in-range")).toHaveLength(7);
    const band = (date: string) => day(date).querySelector<HTMLElement>("[data-band]");
    expect(band("2026-03-18")!.style.backgroundColor).toBe("var(--accent-a4)");
    expect(band("2026-03-16")!.style.insetInlineStart).toBe("0px");
    expect(band("2026-03-23")).toBeNull();
  });

  it("refuses a blocked day but keeps it focusable", async () => {
    const onChange = vi.fn();
    const user = renderRadixDatePicker({ onChange, minDate: "2026-03-10" });
    await open(user);

    await user.click(day("2026-03-09"));

    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-03-09")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-09")).not.toBeDisabled();
  });

  it("changes the month from the native select", async () => {
    const user = renderRadixDatePicker();
    await open(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "6");

    expect(shownMonth()).toBe("July 2026");
  });

  it("clears from an IconButton without opening", async () => {
    const onChange = vi.fn();
    const user = renderRadixDatePicker({ defaultValue: "2026-03-05", onChange });

    const clear = screen.getByRole("button", { name: "Clear date" });
    expect(clear).toHaveClass("rt-IconButton");
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith(null);
    expect(isOpen()).toBe(false);
  });

  it("points the month arrows the way an RTL page reads", async () => {
    const user = renderRadixDatePicker({}, RtlWrapper);
    await open(user);

    const next = screen.getByRole("button", { name: "Next month" });
    expect(next.querySelector("[data-icon]")).toHaveAttribute("data-icon", "chevron-left");
  });

  it("never submits a surrounding form from its buttons", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const Form = ({ children }: { children: ReactNode }) => (
      <Theme>
        <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>{children}</form>
      </Theme>
    );
    const user = renderRadixDatePicker({ defaultValue: "2026-03-05", presets: [{ label: "Soon", value: "2026-03-20" }] }, Form);

    await open(user);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Go to today" }));
    await user.click(screen.getByRole("button", { name: "Soon" }));
    await user.click(screen.getByRole("button", { name: "Clear date" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
