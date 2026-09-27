import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { DatePickerProps } from "../../index";
import { datesWith, day, dialog, focusedDate, freezeToday, isOpen, open, shownMonth, trigger } from "../builders";
import { chakraComponents } from "./chakra/components";
import { failOnReactWarnings, renderIntegration, stubBrowserApis } from "./shared";

/**
 * Chakra wrapper
 *
 * `ChakraProvider` with the default system.
 */
const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
);

/**
 * Render Chakra date picker
 *
 * `<DatePicker>` with Chakra UI v3 parts inside `ChakraProvider`.
 *
 * @param props - The component's props.
 * @returns A user-event instance.
 */
const renderChakraDatePicker = (props: Partial<DatePickerProps> = {}) =>
  renderIntegration(chakraComponents, props, Wrapper);

beforeAll(stubBrowserApis);
freezeToday();

describe("Chakra UI v3", () => {
  failOnReactWarnings();

  it("renders the calendar with Chakra's parts", async () => {
    const user = renderChakraDatePicker();
    await open(user);

    expect(dialog()).not.toHaveClass("sdp__popup");
    expect(day("2026-03-12")).toHaveClass("chakra-button");
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveClass("chakra-native-select__field");
  });

  it("picks a date and shows it on the trigger", async () => {
    const onChange = vi.fn();
    const user = renderChakraDatePicker({ onChange });

    await open(user);
    await user.click(day("2026-03-20"));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(trigger()).toHaveTextContent("Mar 20, 2026");
    expect(isOpen()).toBe(false);
  });

  it("moves through the grid with the keyboard", async () => {
    const user = renderChakraDatePicker();
    await open(user);

    await user.keyboard("{Home}{ArrowUp}");

    expect(focusedDate()).toBe("2026-03-01");
  });

  it("changes the year from the NativeSelect", async () => {
    const user = renderChakraDatePicker();
    await open(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2030");

    expect(shownMonth()).toBe("March 2030");
  });

  it("applies a preset from a Button", async () => {
    const onChange = vi.fn();
    const user = renderChakraDatePicker({
      mode: "range",
      onChange,
      presets: [{ label: "Weekend", value: { from: "2026-03-14", to: "2026-03-15" } }],
    });
    await open(user);

    await user.click(screen.getByRole("button", { name: "Weekend" }));

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-14", to: "2026-03-15" });
    expect(datesWith("range-end")).toEqual(["2026-03-15"]);
  });

  it("refuses a blocked day", async () => {
    const onChange = vi.fn();
    const user = renderChakraDatePicker({ onChange, maxDate: "2026-03-20" });
    await open(user);

    await user.click(day("2026-03-21"));

    expect(onChange).not.toHaveBeenCalled();
    expect(day("2026-03-21")).toHaveAttribute("aria-disabled", "true");
  });
});
