import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { DatePicker, type DatePickerProps } from "../DatePicker";

/**
 * Today
 *
 * The date every suite runs on: Thursday 12 March 2026. Fixed so that "opens
 * on today" and the `data-today` marker are deterministic.
 */
export const TODAY = "2026-03-12";

/**
 * Freeze today
 *
 * Fakes only `Date`, so user-event's own timers keep running for real.
 */
export function freezeToday() {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 2, 12, 10), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

/**
 * Render date picker
 *
 * Renders `<DatePicker>` with a user-event instance.
 *
 * @param props - The component's props.
 * @returns Testing Library's result plus `user`.
 */
export function renderDatePicker(props: Partial<DatePickerProps> = {}) {
  const user = userEvent.setup();
  return { ...render(<DatePicker {...(props as DatePickerProps)} />), user };
}

/**
 * Render element
 *
 * For layouts the tests build themselves out of the compound parts.
 *
 * @param element - What to render.
 * @returns Testing Library's result plus `user`.
 */
export function renderWithUser(element: ReactElement) {
  const user = userEvent.setup();
  return { ...render(element), user };
}

/**
 * Trigger
 *
 * The `role="combobox"` element that opens the dialog. The caption's month
 * and year `<select>`s are comboboxes too, so it is picked out by the popup
 * type it declares.
 */
export const trigger = () => {
  const found = screen
    .getAllByRole("combobox")
    .filter((element) => element.getAttribute("aria-haspopup") === "dialog");
  if (found.length !== 1) throw new Error(`Expected one date picker trigger, found ${found.length}`);
  return found[0]!;
};

/** The popup, once open. */
export const dialog = () => screen.getByRole("dialog");

/** The month grid, once open. */
export const grid = () => screen.getByRole("grid");

/** Whether the popup is showing. */
export const isOpen = () => screen.queryByRole("dialog") !== null;

/**
 * Day
 *
 * The day button for a date, found by its `data-date`.
 *
 * @param date - The calendar date.
 * @returns The button.
 */
export function day(date: string): HTMLElement {
  const element = grid().querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!element) throw new Error(`No day ${date} in the grid`);
  return element;
}

/** The one day that is in the tab order. */
export const activeDay = () => {
  const days = within(grid())
    .getAllByRole("button")
    .filter((button) => button.getAttribute("tabindex") === "0");
  if (days.length !== 1) throw new Error(`Expected one tabbable day, found ${days.length}`);
  return days[0]!;
};

/** The date of the day that has DOM focus. */
export const focusedDate = () => (document.activeElement as HTMLElement | null)?.getAttribute("data-date");

/** The dates currently marked with a `data-*` flag. */
export const datesWith = (flag: string) =>
  Array.from(grid().querySelectorAll<HTMLElement>(`[data-${flag}]`)).map((element) => element.dataset.date);

/** The shown month, read from the grid's accessible name. */
export const shownMonth = () => grid().getAttribute("aria-label");

/**
 * Open the popup
 *
 * Clicks the trigger and waits for the dialog.
 *
 * @param user - The user-event instance.
 * @returns The dialog.
 */
export async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return dialog();
}
