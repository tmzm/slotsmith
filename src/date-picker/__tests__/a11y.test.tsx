import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "../DatePicker";
import { day, dialog, freezeToday, grid, open, renderDatePicker, renderWithUser, trigger } from "./builders";

freezeToday();

describe("the trigger", () => {
  it("announces a dialog, its state and what it controls", async () => {
    const { user } = renderDatePicker();
    const combobox = trigger();

    expect(combobox).toHaveAttribute("aria-haspopup", "dialog");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).not.toHaveAttribute("aria-controls");

    await open(user);

    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(combobox).toHaveAttribute("aria-controls", dialog().id);
  });

  it("is named by the placeholder when the caller gives no name", () => {
    renderDatePicker();
    expect(trigger()).toHaveAccessibleName("Pick a date");
  });

  it("takes an accessible name from the caller", () => {
    renderDatePicker({ "aria-label": "Due date" } as never);
    expect(trigger()).toHaveAccessibleName("Due date");
  });

  it("can be named by a visible label", () => {
    renderWithUser(
      <>
        <span id="due">Due</span>
        <DatePicker aria-labelledby="due" />
      </>,
    );
    expect(trigger()).toHaveAccessibleName("Due");
    expect(trigger()).not.toHaveAttribute("aria-label");
  });

  it("is reachable by keyboard, and skipped when disabled", () => {
    const { unmount } = renderDatePicker();
    expect(trigger()).toHaveAttribute("tabindex", "0");
    unmount();

    renderDatePicker({ disabled: true });
    expect(trigger()).toHaveAttribute("tabindex", "-1");
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
  });

  it("makes clearing a real, named button", () => {
    renderDatePicker({ defaultValue: "2026-03-05" });
    expect(within(trigger()).getByRole("button", { name: "Clear date" })).toBeInstanceOf(HTMLButtonElement);
  });
});

describe("the popup", () => {
  it("is a named, non-modal dialog", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(dialog()).toHaveAttribute("aria-modal", "false");
    expect(dialog()).toHaveAccessibleName("Choose a date");
  });
});

describe("the grid", () => {
  it("is a grid named after the shown month", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(grid()).toHaveAccessibleName("March 2026");
  });

  it("has a header row and six week rows", async () => {
    const { user } = renderDatePicker();
    await open(user);

    const rows = within(grid()).getAllByRole("row");
    expect(rows).toHaveLength(7);
    expect(within(rows[0]!).getAllByRole("columnheader")).toHaveLength(7);
    for (const row of rows.slice(1)) expect(within(row).getAllByRole("gridcell")).toHaveLength(7);
  });

  it("names each column header with the full weekday", async () => {
    const { user } = renderDatePicker({ weekStartsOn: 0 });
    await open(user);

    const headers = within(grid()).getAllByRole("columnheader");
    expect(headers[0]).toHaveAccessibleName("Sunday");
    expect(headers[0]).toHaveTextContent("S");
  });

  it("names each day with the full date", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(day("2026-03-12")).toHaveAccessibleName("Thursday, March 12, 2026");
    expect(screen.getByRole("button", { name: "Friday, March 20, 2026" })).toBe(day("2026-03-20"));
  });

  it("marks the selected cells with aria-selected", async () => {
    const { user } = renderDatePicker({ defaultValue: "2026-03-05" });
    await open(user);

    const cell = (date: string) => day(date).closest('[role="gridcell"]');
    expect(cell("2026-03-05")).toHaveAttribute("aria-selected", "true");
    expect(cell("2026-03-06")).toHaveAttribute("aria-selected", "false");
  });

  it("marks today as the current date", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(day("2026-03-12")).toHaveAttribute("aria-current", "date");
    expect(day("2026-03-13")).not.toHaveAttribute("aria-current");
  });

  it("keeps blocked days focusable, marked with aria-disabled", async () => {
    const { user } = renderDatePicker({ minDate: "2026-03-10" });
    await open(user);

    const blocked = day("2026-03-09");
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAttribute("data-disabled");
    expect(blocked).not.toBeDisabled();
  });

  it("declares whether several dates may be selected", async () => {
    const single = renderDatePicker();
    await open(single.user);
    expect(grid()).not.toHaveAttribute("aria-multiselectable");
    single.unmount();

    const multiple = renderDatePicker({ mode: "multiple" });
    await open(multiple.user);
    expect(grid()).toHaveAttribute("aria-multiselectable", "true");
  });

  it("names the caption's controls", async () => {
    const { user } = renderDatePicker();
    await open(user);

    expect(screen.getByRole("combobox", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
  });
});
