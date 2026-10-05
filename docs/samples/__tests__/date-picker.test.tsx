// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ar } from "slotsmith/locales/ar";
import { SlotsmithProvider } from "slotsmith/provider";
import { PROVIDERS, type ProviderName } from "@samples/adapters/providers";
import AntdDemo from "@samples/adapters/date-picker/antd-demo";
import ChakraDemo from "@samples/adapters/date-picker/chakra-demo";
import MuiDemo from "@samples/adapters/date-picker/mui-demo";
import RadixDemo from "@samples/adapters/date-picker/radix-demo";
import ShadcnDemo from "@samples/adapters/date-picker/shadcn-demo";
import BoundsAndBlockedDays from "@samples/date-picker/bounds-and-blocked-days";
import CompoundParts from "@samples/date-picker/compound-parts";
import DayContent from "@samples/date-picker/day-content";
import Labels from "@samples/date-picker/labels";
import Modes from "@samples/date-picker/modes";
import Overview from "@samples/date-picker/overview";
import Presets from "@samples/date-picker/presets";
import QuickStart from "@samples/date-picker/quick-start";

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
const open = (name: string | RegExp) => {
  const combobox = screen.getByRole("combobox", { name });
  fireEvent.click(combobox);
  return combobox;
};

/** An Arabic page: the `ar` pack from the provider, inside a right-to-left ancestor. */
const Arabic = ({ children }: { children: ReactNode }) => (
  <div dir="rtl" lang="ar">
    <SlotsmithProvider locale="ar" locales={[ar]}>
      {children}
    </SlotsmithProvider>
  </div>
);

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
    expect(combobox.textContent).toContain("Apr 28, 2025");
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
    expect(screen.getByText("Stay: 2026-03-17 to 2026-03-17")).toBeTruthy();
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
    expect(combobox.textContent).toContain("Mar 20, 2026");
    expect(screen.getByText("Value: 2026-03-20")).toBeTruthy();
  });

  it("multiple: each pick toggles a day, the calendar stays open and the trigger counts past two", () => {
    render(<Modes />);
    const combobox = open(/Days off/);
    expect(grid().getAttribute("aria-multiselectable")).toBe("true");
    fireEvent.click(day("2026-03-20"));
    fireEvent.click(day("2026-03-18"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(combobox.textContent).toContain("Mar 18, 2026, Mar 20, 2026");
    fireEvent.click(day("2026-03-25"));
    expect(combobox.textContent).toContain("3 dates selected");
    expect(screen.getByText("Value: 2026-03-18, 2026-03-20, 2026-03-25")).toBeTruthy();
    fireEvent.click(day("2026-03-20"));
    expect(screen.getByText("Value: 2026-03-18, 2026-03-25")).toBeTruthy();
    expect(day("2026-03-18").parentElement!.getAttribute("aria-selected")).toBe("true");
  });

  it("range: picking two days sets data-range-start and data-range-end, with the days between in range", () => {
    render(<Modes />);
    const combobox = open(/Stay/);
    fireEvent.click(day("2026-03-20"));
    expect(combobox.textContent).toContain("Mar 20, 2026 — …");
    // The preview follows the pointer until the end is picked.
    fireEvent.pointerEnter(day("2026-03-23"));
    expect(day("2026-03-22").hasAttribute("data-in-preview")).toBe(true);
    fireEvent.click(day("2026-03-24"));
    expect(day("2026-03-20").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-24").hasAttribute("data-range-end")).toBe(true);
    expect(day("2026-03-22").hasAttribute("data-in-range")).toBe(true);
    expect(day("2026-03-25").hasAttribute("data-in-range")).toBe(false);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(combobox.textContent).toContain("Mar 20, 2026 — Mar 24, 2026");
    expect(screen.getByText("Value: 2026-03-20 to 2026-03-24")).toBeTruthy();
    // A click before the start begins a new range.
    fireEvent.click(day("2026-03-10"));
    expect(screen.getByText("Value: 2026-03-10 to …")).toBeTruthy();
  });

  it("the clear button empties the value without opening the calendar", () => {
    render(<Modes />);
    const combobox = open(/Due date/);
    fireEvent.click(day("2026-03-20"));
    fireEvent.click(within(combobox).getByRole("button", { name: "Clear date" }));
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
    expect(screen.getByText("Value: 2026-03-30 to 2026-04-02")).toBeTruthy();
    expect(day("2026-03-30").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-04-02").hasAttribute("data-range-end")).toBe(true);

    key(day("2026-04-02"), "PageDown");
    expect(focusedDate()).toBe("2026-05-02");
    expect(grid().getAttribute("aria-label")).toMatch(/مايو/);
    expect(screen.getByText("Value: 2026-03-30 to 2026-04-02")).toBeTruthy();
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
    expect(screen.getByText("Appointment: 2026-03-20")).toBeTruthy();
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
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    expect(locked.tabIndex).toBe(-1);
    fireEvent.click(locked);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(locked).queryByRole("button")).toBeNull();
  });
});

describe("date picker guide: presets", () => {
  it("clicking a preset sets the value; a date preset picks that one day", () => {
    render(<Presets />);
    const combobox = open("Stay");
    fireEvent.click(screen.getByRole("button", { name: "Next 7 days" }));
    expect(screen.getByText("Stay: 2026-03-16 to 2026-03-22")).toBeTruthy();
    expect(combobox.textContent).toContain("Mar 16, 2026 — Mar 22, 2026");
    expect(day("2026-03-16").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-22").hasAttribute("data-range-end")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    expect(screen.getByText("Stay: 2026-03-17 to 2026-03-17")).toBeTruthy();
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

describe("date picker: labels", () => {
  it("speaks German, with two labels replaced", () => {
    render(<Labels />);
    const combobox = screen.getByRole("combobox", { name: "Urlaubstage" });
    expect(combobox.textContent).toContain("Urlaubstage wählen");
    fireEvent.click(combobox);
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

/** Each adapter demo and an element only that library renders, once the calendar is open. */
const ADAPTER_DEMOS: [name: ProviderName, Demo: ComponentType, marker: string][] = [
  ["shadcn", ShadcnDemo, '[data-slot="date-picker"]'],
  ["mui", MuiDemo, ".MuiPaper-root"],
  ["chakra", ChakraDemo, "[class*='chakra-button']"],
  ["antd", AntdDemo, ".ant-btn"],
  ["radix", RadixDemo, ".rt-Button, .rt-IconButton"],
];

describe("date picker adapter demos", () => {
  beforeAll(() => {
    // MUI, Chakra and Radix read these on mount.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    proto.hasPointerCapture ??= () => false;
    proto.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  it.each(ADAPTER_DEMOS)("%s: shows a range with the library's parts, applies a preset and picks a new range", { timeout: 60000 }, (name, Demo, marker) => {
    const Provider = PROVIDERS[name];
    const { container } = render(
      <Provider theme="dark" dir="ltr">
        <Demo />
      </Provider>,
    );
    const combobox = screen.getByRole("combobox", { name: "Stay" });
    expect(combobox.textContent).toContain("Mar 18, 2026 — Mar 21, 2026");
    fireEvent.click(combobox);
    expect(container.querySelector(marker), `${name} parts`).not.toBeNull();
    expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("March 2026");
    expect(day("2026-03-18").hasAttribute("data-range-start")).toBe(true);
    expect(day("2026-03-21").hasAttribute("data-range-end")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next 7 days" }));
    expect(combobox.textContent).toContain("Mar 16, 2026 — Mar 22, 2026");
    fireEvent.click(day("2026-03-24"));
    fireEvent.click(day("2026-03-26"));
    expect(combobox.textContent).toContain("Mar 24, 2026 — Mar 26, 2026");
    key(day("2026-03-26"), "ArrowRight");
    expect(focusedDate()).toBe("2026-03-27");
    key(day("2026-03-27"), "Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(combobox);
  });
});
