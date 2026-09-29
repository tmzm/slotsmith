import { ConfigProvider, theme } from "antd";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger } from "../builders";
import { antdDatePicker } from "./antd/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Ant Design wrapper
 *
 * `ConfigProvider` with the default theme.
 */
const Wrapper = ({ children }: { children: ReactNode }) => <ConfigProvider>{children}</ConfigProvider>;

/**
 * RTL wrapper
 *
 * `ConfigProvider` laid out right to left, under `dir="rtl"`.
 */
const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider direction="rtl">
    <div dir="rtl">{children}</div>
  </ConfigProvider>
);

/** The default theme's tokens, to check the colours the parts paint with. */
const token = theme.getDesignToken();

/**
 * CSS colour
 *
 * @param color - A token colour, in any CSS syntax.
 * @returns The same colour as the DOM reports it.
 */
function cssColor(color: string) {
  const probe = document.createElement("i");
  probe.style.backgroundColor = color;
  return probe.style.backgroundColor;
}

/**
 * Render Ant Design date picker
 *
 * `<DatePicker>` with Ant Design v6 parts inside `ConfigProvider`.
 *
 * @param props - The component's props.
 * @param wrapper - The provider around it.
 * @returns A user-event instance.
 */
const renderAntdDatePicker = (props: Partial<DatePickerProps> = {}, wrapper = Wrapper) =>
  renderIntegration(antdDatePicker, props, wrapper);

beforeAll(stubBrowserApis);
freezeToday();

describe("Ant Design v6", () => {
  failOnReactWarnings();

  it("renders the calendar with Ant's primitives", async () => {
    const user = renderAntdDatePicker();
    await open(user);

    expect(dialog()).not.toHaveClass("sdp__popup");
    expect(dialog().style.backgroundColor).toBe(cssColor(token.colorBgElevated));
    expect(trigger().style.borderColor).toBe(cssColor(token.colorPrimary));
    expect(day("2026-03-12")).toHaveClass("ant-btn");
    expect(day("2026-03-12").style.boxShadow).toContain(token.colorPrimary);
    expect(screen.getByRole("button", { name: "Next month" })).toHaveClass("ant-btn");
  });

  it("picks a date from a Button and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderAntdDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(isOpen()).toBe(false);

    await open(user);
    expect(day("2026-03-20")).toHaveClass("ant-btn-variant-solid");
  });

  it("moves through the grid with the keyboard", async () => {
    const user = renderAntdDatePicker();
    await open(user);

    await user.keyboard("{ArrowRight}{ArrowDown}");

    expect(focusedDate()).toBe("2026-03-20");
    expect(day("2026-03-20")).toHaveAttribute("tabindex", "0");
  });

  it("applies a range preset from a Button and bands the range", async () => {
    const onChange = vi.fn();
    const user = renderAntdDatePicker({
      mode: "range",
      onChange,
      presets: [{ label: "Next week", value: { from: "2026-03-16", to: "2026-03-22" } }],
    });
    await open(user);

    const preset = screen.getByRole("button", { name: "Next week" });
    expect(preset).toHaveClass("ant-btn");
    await user.click(preset);

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-16", to: "2026-03-22" });
    expect(datesWith("in-range")).toHaveLength(7);
    const band = (date: string) => day(date).querySelector<HTMLElement>("[data-band]");
    expect(band("2026-03-18")!.style.backgroundColor).toBe(cssColor(token.controlItemBgActive));
    expect(band("2026-03-16")!.style.insetInlineStart).toBe("0px");
    expect(band("2026-03-23")).toBeNull();
  });

  it("refuses a blocked day but keeps it focusable", async () => {
    const onChange = vi.fn();
    const user = renderAntdDatePicker({ onChange, minDate: "2026-03-10" });
    await open(user);

    await user.click(day("2026-03-09"));

    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-03-09")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-03-09")).not.toBeDisabled();
  });

  it("changes the month from the native select", async () => {
    const user = renderAntdDatePicker();
    await open(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "6");

    expect(shownMonth()).toBe("July 2026");
  });

  it("clears from a Button without opening", async () => {
    const onChange = vi.fn();
    const user = renderAntdDatePicker({ defaultValue: "2026-03-05", onChange });

    const clear = screen.getByRole("button", { name: "Clear date" });
    expect(clear).toHaveClass("ant-btn");
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith(null);
    expect(isOpen()).toBe(false);
  });

  it("points the month arrows the way an RTL page reads", async () => {
    const user = renderAntdDatePicker({}, RtlWrapper);
    await open(user);

    const next = screen.getByRole("button", { name: "Next month" });
    expect(next).toHaveClass("ant-btn-rtl");
    expect(within(next).getByRole("img", { hidden: true, name: "left" })).toBeInTheDocument();
  });
});
