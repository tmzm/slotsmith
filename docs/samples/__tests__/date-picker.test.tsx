// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ar } from "slotsmith/locales/ar";
import { SlotsmithProvider } from "slotsmith/provider";
import { createValueCodec } from "slotsmith/date-picker";
import BoundsAndBlockedDays from "@samples/date-picker/bounds-and-blocked-days";
import CompoundParts from "@samples/date-picker/compound-parts";
import DayContent from "@samples/date-picker/day-content";
import Labels from "@samples/date-picker/labels";
import Modes from "@samples/date-picker/modes";
import ValueFormat from "@samples/date-picker/value-format";
import Typing from "@samples/date-picker/typing";
import ButtonTrigger from "@samples/date-picker/button-trigger";
import Overview from "@samples/date-picker/overview";
import Presets from "@samples/date-picker/presets";
import QuickStart from "@samples/date-picker/quick-start";
import Validation from "@samples/date-picker/validation";

/** A Monday. The samples read today from the clock once mounted, so the tests pin it. */
const NOW = new Date(2026, 2, 16, 12);

let consoleError: MockInstance;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const key = (element: Element, name: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(element, { key: name, ...init });
/** The day button for a date in the open calendar. */
const day = (date: string) => document.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)!;
const focusedDate = () => document.activeElement?.getAttribute("data-date");
const grid = () => screen.getByRole("grid");
/** The calendar button beside a text-field trigger. */
const toggleOf = (combobox: HTMLElement) =>
  combobox.closest<HTMLElement>("[data-trigger]")!.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
/** Opens a picker: from the calendar button beside its text field, or by pressing its button trigger. */
const open = (name: string | RegExp) => {
  const combobox = screen.getByRole("combobox", { name });
  fireEvent.click(combobox instanceof HTMLInputElement ? toggleOf(combobox) : combobox);
  return combobox;
};
/** What a trigger shows: the text field's text, or the button's. */
const shown = (combobox: HTMLElement) => (combobox instanceof HTMLInputElement ? combobox.value : combobox.textContent);

/** An Arabic page: the `ar` pack from the provider, inside a right-to-left ancestor. */
const Arabic = ({ children }: { children: ReactNode }) => (
  <div dir="rtl" lang="ar">
    <SlotsmithProvider locale="ar" locales={[ar]}>
      {children}
    </SlotsmithProvider>
  </div>
);

/** A day as the pickers write it by default: the instant it starts, in the zone the suite runs in. */
const at = (date: string) => createValueCodec().format(date);

describe("date picker: quick start", () => {
  it("opens with ArrowDown on today, moves with the arrows and picks with Enter", () => {
    render(<QuickStart />);
    const combobox = screen.getByRole("combobox", { name: "Due date" });
    expect(combobox.getAttribute("aria-haspopup")).toBe("dialog");
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    act(() => combobox.focus());
    key(combobox, "ArrowDown");
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Choose a date" });
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(combobox.getAttribute("aria-controls")).toBe(dialog.id);
    expect(grid().getAttribute("aria-label")).toBe("March 2026");
    expect(focusedDate()).toBe("2026-03-16");
    expect(day("2026-03-16").getAttribute("aria-current")).toBe("date");
    // One day is in the tab order.
    expect(grid().querySelectorAll('[data-date][tabindex="0"]')).toHaveLength(1);

    key(day("2026-03-16"), "ArrowRight");
    expect(focusedDate()).toBe("2026-03-17");
    key(day("2026-03-17"), "ArrowDown");
    expect(focusedDate()).toBe("2026-03-24");
    key(day("2026-03-24"), "Home");
    expect(focusedDate()).toBe("2026-03-22");
    key(day("2026-03-22"), "End");
    expect(focusedDate()).toBe("2026-03-28");
    key(day("2026-03-28"), "PageDown");
    expect(focusedDate()).toBe("2026-04-28");
    expect(grid().getAttribute("aria-label")).toBe("April 2026");
    key(day("2026-04-28"), "PageUp", { shiftKey: true });
    expect(focusedDate()).toBe("2025-04-28");

    fireEvent.click(day("2025-04-28"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(combobox);
    expect(shown(combobox)).toBe("04/28/2025");
  });

  it("closes with Escape and returns focus to the trigger", () => {
    render(<QuickStart />);
    const combobox = open("Due date");
    key(day("2026-03-16"), "Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(combobox);
  });
});

describe("date picker: overview", () => {
  it("names both pickers from their visible labels and reports the selection", () => {
    render(<Overview />);
    expect(screen.getByRole("combobox", { name: "Due date" })).toBeTruthy();
    open("Stay");
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    expect(screen.getByText(`Stay: ${at("2026-03-17")} to ${at("2026-03-17")}`)).toBeTruthy();
    expect(screen.getByText("Due: none")).toBeTruthy();
  });
});

describe("date picker guide: modes", () => {
  it("single: picking a day sets one date and closes", () => {
    render(<Modes />);
    const combobox = open(/Due date/);
    expect(grid().getAttribute("aria-multiselectable")).toBeNull();
    fireEvent.click(day("2026-03-20"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(shown(combobox)).toBe("03/20/2026");
    expect(screen.getByText(`Value: ${at("2026-03-20")}`)).toBeTruthy();
  });

  it("multiple: each pick toggles a day, the calendar stays open and the field lists the days", () => {
    render(<Modes />);
    const combobox = open(/Days off/);
    expect(grid().getAttribute("aria-multiselectable")).toBe("true");
    fireEvent.click(day("2026-03-20"));
    fireEvent.click(day("2026-03-18"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(shown(combobox)).toBe("03/18/2026, 03/20/2026");
    fireEvent.click(day("2026-03-25"));
    expect(shown(combobox)).toBe("03/18/2026, 03/20/2026, 03/25/2026");
    expect(screen.getByText(`Value: ${at("2026-03-18")}, ${at("2026-03-20")}, ${at("2026-03-25")}`)).toBeTruthy();
    fireEvent.click(day("2026-03-20"));
    expect(screen.getByText(`Value: ${at("2026-03-18")}, ${at("2026-03-25")}`)).toBeTruthy();
    expect(day("2026-03-18").parentElement!.getAttribute("aria-selected")).toBe("true");
  });

  it("range: picking two days sets data-range-start and data-range-end, with the days between in range", () => {
    render(<Modes />);
    const combobox = open(/Stay/);
    fireEvent.click(day("2026-03-20"));
    expect(shown(combobox)).toBe("03/20/2026 – ");
    // The preview follows the pointer until the end is picked.
    fireEvent.pointerEnter(day("2026-03-23"));
    expect(day("2026-03-22").hasAttribute("data-in-preview")).toBe(true);
    fireEvent.click(day("2026-03-24"));
    expect(day("2026-03-20").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-24").hasAttribute("data-range-end")).toBe(true);
    expect(day("2026-03-22").hasAttribute("data-in-range")).toBe(true);
    expect(day("2026-03-25").hasAttribute("data-in-range")).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(shown(combobox)).toBe("03/20/2026 – 03/24/2026");
    expect(screen.getByText(`Value: ${at("2026-03-20")} to ${at("2026-03-24")}`)).toBeTruthy();
    // A click before the start begins a new range.
    fireEvent.click(day("2026-03-10"));
    expect(screen.getByText(`Value: ${at("2026-03-10")} to …`)).toBeTruthy();
  });

  it("the clear button empties the value without opening the calendar", () => {
    render(<Modes />);
    const combobox = open(/Due date/);
    fireEvent.click(day("2026-03-20"));
    fireEvent.click(within(combobox.closest<HTMLElement>("[data-trigger]")!).getByRole("button", { name: "Clear date" }));
    // The due date and the untouched stay are both empty again.
    expect(screen.getAllByText("Value: null")).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("date picker in right-to-left", () => {
  it("ArrowLeft moves focus to the next day and ArrowRight to the previous one", () => {
    render(<Modes />, { wrapper: Arabic });
    open(/Due date/);
    expect(focusedDate()).toBe("2026-03-16");
    key(day("2026-03-16"), "ArrowLeft");
    expect(focusedDate()).toBe("2026-03-17");
    key(day("2026-03-17"), "ArrowRight");
    key(day("2026-03-16"), "ArrowRight");
    expect(focusedDate()).toBe("2026-03-15");
    // The Arabic pack names the dialog and Intl names the month.
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("اختيار التاريخ");
    expect(grid().getAttribute("aria-label")).toMatch(/مارس/);
  });

  it("keeps a range selected across a month boundary: arrows cross it, PageDown changes month", () => {
    render(<Modes />, { wrapper: Arabic });
    open(/Stay/);
    key(day("2026-03-16"), "ArrowDown");
    key(day("2026-03-23"), "ArrowDown");
    expect(focusedDate()).toBe("2026-03-30");
    fireEvent.click(day("2026-03-30"));
    // Three days to the left is three days later, in April.
    key(day("2026-03-30"), "ArrowLeft");
    key(day("2026-03-31"), "ArrowLeft");
    key(day("2026-04-01"), "ArrowLeft");
    expect(focusedDate()).toBe("2026-04-02");
    expect(grid().getAttribute("aria-label")).toMatch(/أبريل/);
    fireEvent.click(day("2026-04-02"));
    expect(screen.getByText(`Value: ${at("2026-03-30")} to ${at("2026-04-02")}`)).toBeTruthy();
    expect(day("2026-03-30").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-04-02").hasAttribute("data-range-end")).toBe(true);

    key(day("2026-04-02"), "PageDown");
    expect(focusedDate()).toBe("2026-05-02");
    expect(grid().getAttribute("aria-label")).toMatch(/مايو/);
    expect(screen.getByText(`Value: ${at("2026-03-30")} to ${at("2026-04-02")}`)).toBeTruthy();
    key(day("2026-05-02"), "PageUp");
    expect(day("2026-04-02").hasAttribute("data-range-end")).toBe(true);
    expect(day("2026-04-01").hasAttribute("data-in-range")).toBe(true);
    expect(day("2026-03-30").hasAttribute("data-range-start")).toBe(true);
  });
});

describe("date picker guide: bounds and blocked days", () => {
  it("a day before minDate is aria-disabled, stays focusable and cannot be picked", () => {
    render(<BoundsAndBlockedDays />);
    open("Appointment");
    const yesterday = day("2026-03-15");
    expect(yesterday.getAttribute("aria-disabled")).toBe("true");
    expect(yesterday.disabled).toBe(false);
    act(() => yesterday.focus());
    expect(document.activeElement).toBe(yesterday);
    fireEvent.click(yesterday);
    expect(screen.getByText("Appointment: none")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("the arrows cross a blocked weekend, which cannot be picked", () => {
    render(<BoundsAndBlockedDays />);
    open("Appointment");
    key(day("2026-03-16"), "ArrowDown");
    key(day("2026-03-23"), "ArrowLeft");
    key(day("2026-03-22"), "ArrowLeft");
    expect(focusedDate()).toBe("2026-03-21");
    expect(day("2026-03-21").getAttribute("aria-disabled")).toBe("true");
    key(day("2026-03-21"), "Enter");
    fireEvent.click(day("2026-03-21"));
    expect(screen.getByText("Appointment: none")).toBeTruthy();
    fireEvent.click(day("2026-03-20"));
    expect(screen.getByText(`Appointment: ${at("2026-03-20")}`)).toBeTruthy();
  });

  it("stops at the bounds: no earlier month, no month after maxDate, and the keyboard is clamped", () => {
    render(<BoundsAndBlockedDays />);
    open("Appointment");
    expect((screen.getByRole("button", { name: "Previous month" }) as HTMLButtonElement).disabled).toBe(true);
    key(day("2026-03-16"), "ArrowUp");
    expect(focusedDate()).toBe("2026-03-16");
    key(day("2026-03-16"), "PageDown", { shiftKey: true });
    expect(focusedDate()).toBe("2026-05-16");
    expect((screen.getByRole("button", { name: "Next month" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(screen.getByRole("combobox", { name: "Year" })).getAllByRole("option")).toHaveLength(1);
  });

  it("a disabled picker does not open", () => {
    render(<BoundsAndBlockedDays />);
    const locked = screen.getByRole("combobox", { name: "Confirmed on" });
    // A disabled field leaves the tab order, and so does its calendar button.
    expect((locked as HTMLInputElement).disabled).toBe(true);
    expect(toggleOf(locked).disabled).toBe(true);
    fireEvent.click(toggleOf(locked));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(locked.closest<HTMLElement>("[data-trigger]")!).queryByRole("button", { name: "Clear date" })).toBeNull();
  });
});

describe("date picker guide: presets", () => {
  it("clicking a preset sets the value; a date preset picks that one day", () => {
    render(<Presets />);
    const combobox = open("Stay");
    fireEvent.click(screen.getByRole("button", { name: "Next 7 days" }));
    expect(screen.getByText(`Stay: ${at("2026-03-16")} to ${at("2026-03-22")}`)).toBeTruthy();
    expect(shown(combobox)).toBe("03/16/2026 – 03/22/2026");
    expect(day("2026-03-16").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-22").hasAttribute("data-range-end")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    expect(screen.getByText(`Stay: ${at("2026-03-17")} to ${at("2026-03-17")}`)).toBeTruthy();
  });

  it("Go to today shows today's month without picking anything", () => {
    render(<Presets />);
    open("Stay");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(grid().getAttribute("aria-label")).toBe("April 2026");
    fireEvent.click(screen.getByRole("button", { name: "Go to today" }));
    expect(grid().getAttribute("aria-label")).toBe("March 2026");
    expect(day("2026-03-16").tabIndex).toBe(0);
    expect(screen.getByText("Stay: none")).toBeTruthy();
    expect(document.querySelector("[data-selected]")).toBeNull();
  });
});

describe("date picker guide: day content", () => {
  it("shows a price under each day that can be picked, and totals the nights", () => {
    render(<DayContent />);
    open("Stay");
    expect(day("2026-03-16").textContent).toMatch(/^16\$\d+$/);
    // Before minDate, and outside the month: the number only.
    expect(day("2026-03-15").textContent).toBe("15");
    expect(day("2026-04-01").textContent).toBe("1");
    // The accessible name is still the full date.
    expect(day("2026-03-16").getAttribute("aria-label")).toBe("Monday, March 16, 2026");
    fireEvent.click(day("2026-03-16"));
    fireEvent.click(day("2026-03-18"));
    const price = (date: string) => Number(day(date).textContent!.split("$")[1]);
    expect(screen.getByText(`Total: $${price("2026-03-16") + price("2026-03-17")}`)).toBeTruthy();
  });
});

describe("date picker guide: compound parts", () => {
  it("names the trigger from the label and reads the selection from the context", () => {
    render(<CompoundParts />);
    expect(screen.getByText("No days picked.")).toBeTruthy();
    open("Days off");
    fireEvent.click(day("2026-03-18"));
    fireEvent.click(day("2026-03-19"));
    expect(screen.getByText(/2 days picked/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("No days picked.")).toBeTruthy();
  });
});

describe("date picker guide: validation", () => {
  it("marks the combobox invalid on submit, points it at the message, and clears it once a day is picked", () => {
    render(<Validation />);
    const combobox = screen.getByRole("combobox", { name: "Start date" });
    expect(combobox.getAttribute("aria-invalid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(combobox.getAttribute("aria-invalid")).toBe("true");
    expect(combobox.closest("[data-invalid]")).not.toBeNull();
    expect(document.getElementById(combobox.getAttribute("aria-describedby")!)?.textContent).toBe("The start date is required.");
    expect(document.activeElement).toBe(combobox);

    key(combobox, "ArrowDown");
    fireEvent.click(day("2026-03-16"));
    expect(combobox.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText("The start date is required.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(`Sent: ${at("2026-03-16")}`)).toBeTruthy();
  });
});

describe("date picker: labels", () => {
  it("speaks German, with two labels replaced", () => {
    render(<Labels />);
    const combobox = screen.getByRole("combobox", { name: "Urlaubstage" });
    // The field shows the German date order, and its calendar button the replaced label.
    expect(combobox.getAttribute("placeholder")).toBe("DD.MM.YYYY");
    fireEvent.click(screen.getByRole("button", { name: "Kalender zeigen" }));
    expect(screen.getByRole("dialog", { name: "Datum auswählen" })).toBeTruthy();
    expect(grid().getAttribute("aria-label")).toBe("März 2026");
    expect(screen.getByRole("button", { name: "Heute anzeigen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nächster Monat" })).toBeTruthy();
  });
});

describe("date picker samples: prerender", () => {
  const SAMPLES: [string, ComponentType][] = [
    ["overview", Overview],
    ["bounds-and-blocked-days", BoundsAndBlockedDays],
    ["presets", Presets],
    ["day-content", DayContent],
  ];

  it.each(SAMPLES)("%s: the server markup does not depend on the build date, and hydrates without a mismatch", async (_name, Sample) => {
    const html = renderToString(<Sample />);
    vi.setSystemTime(new Date(2027, 0, 9, 12));
    expect(renderToString(<Sample />)).toBe(html);

    const recoverable = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = html;
    const root = await act(async () => hydrateRoot(container, <Sample />, { onRecoverableError: recoverable }));
    expect(recoverable).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });
});

describe("date-picker guide: value format and time zone", () => {
  it("shows the value in its own format", () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 2, 12, 20), toFake: ["Date"] });
    const error = vi.spyOn(console, "error");
    render(<ValueFormat />);
    expect(screen.getByText('value: "15/04/2026"')).toBeTruthy();
    const [due] = screen.getAllByRole("combobox");
    expect(shown(due!)).toBe("04/15/2026");
    expect(error).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("date picker guide: typing a date", () => {
  it("reads a typed date from the field its label names", () => {
    render(<Typing />);
    const due = screen.getByRole("combobox", { name: "Due date" }) as HTMLInputElement;
    expect(due.getAttribute("placeholder")).toBe("MM/DD/YYYY");
    fireEvent.change(due, { target: { value: "3/20/2026" } });
    key(due, "Enter");
    expect(screen.getByText(`Due: ${at("2026-03-20")}`)).toBeTruthy();
    expect(due.value).toBe("03/20/2026");
  });

  it("opens the check-in calendar on focus and keeps focus in the field", () => {
    render(<Typing />);
    const checkIn = screen.getByRole("combobox", { name: "Check-in" });
    act(() => checkIn.focus());
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement).toBe(checkIn);
  });

  it("the button trigger shows the formatted date and opens when pressed", () => {
    render(<ButtonTrigger />);
    const reminder = screen.getByRole("combobox", { name: "Reminder" });
    expect(reminder.tagName).toBe("DIV");
    fireEvent.click(reminder);
    fireEvent.click(day("2026-03-20"));
    expect(reminder.textContent).toContain("Mar 20, 2026");
    const trip = screen.getByRole("combobox", { name: "Trip" });
    expect(trip.textContent).toContain("Pick your dates");
  });
});
