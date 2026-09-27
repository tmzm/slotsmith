import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker, type DatePickerProps } from "../DatePicker";
import type { DatePickerComponents, DatePickerLabels, DpNavProps } from "../slots/types";
import { day, focusedDate, freezeToday, grid, open, renderWithUser, shownMonth, trigger } from "./builders";

freezeToday();

/**
 * Arabic labels
 *
 * Every string the component can render, translated. The test asserts that
 * none of the English defaults survive, which is what proves the component
 * has no hardcoded text.
 */
const ARABIC: DatePickerLabels = {
  placeholder: "اختر تاريخًا",
  clear: "مسح التاريخ",
  previous: "الشهر السابق",
  next: "الشهر التالي",
  today: "اليوم",
  month: "الشهر",
  year: "السنة",
  dialog: "اختيار التاريخ",
  count: (count) => `${count} تواريخ محددة`,
  rangeStart: (from) => `${from} — …`,
  range: (from, to) => `${from} إلى ${to}`,
};

/**
 * Render in Arabic
 *
 * `ar-EG` with the week starting on Saturday, inside a right-to-left
 * ancestor, the way an Arabic page sets direction once at the top.
 *
 * @param props - Overrides for the component's props.
 * @returns Testing Library's result plus `user`.
 */
function renderArabic(props: Partial<DatePickerProps> = {}) {
  return renderWithUser(
    <div dir="rtl" lang="ar">
      <DatePicker locale="ar-EG" weekStartsOn={6} labels={ARABIC} {...(props as DatePickerProps)} />
    </div>,
  );
}

describe("translating every string", () => {
  it("leaves no English default behind", async () => {
    const { user } = renderArabic({ defaultValue: "2026-03-05" } as never);
    await open(user);

    const rendered = document.body.textContent ?? "";
    const named = Array.from(document.querySelectorAll("[aria-label]")).map((element) =>
      element.getAttribute("aria-label"),
    );

    for (const english of ["Pick a date", "Clear date", "Previous month", "Next month", "Today", "Month", "Year"]) {
      expect(rendered).not.toContain(english);
      expect(named).not.toContain(english);
    }
    expect(screen.getByRole("dialog")).toHaveAccessibleName("اختيار التاريخ");
    expect(screen.getByRole("button", { name: "مسح التاريخ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اليوم" })).toBeInTheDocument();
  });

  it("translates the trigger's summaries", async () => {
    const { unmount } = renderArabic({ mode: "multiple", defaultValue: ["2026-03-01", "2026-03-02", "2026-03-03"] });
    expect(trigger()).toHaveTextContent("3 تواريخ محددة");
    unmount();

    renderArabic({ mode: "range", defaultValue: { from: "2026-03-01", to: "2026-03-03" } });
    expect(trigger()).toHaveTextContent("إلى");
  });

  it("merges a partial override with the defaults", () => {
    renderWithUser(<DatePicker labels={{ placeholder: "When?" }} />);
    expect(trigger()).toHaveTextContent("When?");
  });
});

describe("names from Intl", () => {
  it("names the months in Arabic", async () => {
    const { user } = renderArabic();
    await open(user);

    const month = screen.getByRole("combobox", { name: "الشهر" });
    expect(within(month).getAllByRole("option")[2]).toHaveTextContent("مارس");
    expect(month).toHaveValue("2");
  });

  it("starts the week on Saturday", async () => {
    const { user } = renderArabic();
    await open(user);

    const headers = within(grid()).getAllByRole("columnheader");
    expect(headers[0]).toHaveAccessibleName("السبت");
    expect(headers[6]).toHaveAccessibleName("الجمعة");
    expect(day("2026-02-28")).toBe(grid().querySelector("[data-date]"));
  });

  it("falls back to the locale's own first day", async () => {
    const { user } = renderWithUser(<DatePicker locale="en-GB" />);
    await open(user);

    expect(within(grid()).getAllByRole("columnheader")[0]).toHaveAccessibleName("Monday");
  });

  it("formats the trigger and the day names in the locale", async () => {
    const { user } = renderArabic({ defaultValue: "2026-03-12" } as never);

    expect(trigger()).toHaveTextContent("١٢ مارس ٢٠٢٦");
    await open(user);
    expect(day("2026-03-12")).toHaveAccessibleName("الخميس، ١٢ مارس ٢٠٢٦");
  });
});

describe("right to left", () => {
  /**
   * Nav spy
   *
   * A `Nav` part that renders what it was told, so the test can read the
   * direction each control received.
   */
  const Nav: DatePickerComponents["Nav"] = ({ direction, onClick, disabled, ...aria }: DpNavProps) => (
    <button type="button" data-direction={direction} onClick={onClick} disabled={disabled} {...aria} />
  );

  it("swaps the navigation arrows", async () => {
    const { user } = renderArabic({ components: { Nav } });
    await open(user);

    expect(screen.getByRole("button", { name: "الشهر السابق" })).toHaveAttribute("data-direction", "next");
    expect(screen.getByRole("button", { name: "الشهر التالي" })).toHaveAttribute("data-direction", "previous");
  });

  it("keeps them unswapped left to right", async () => {
    const { user } = renderWithUser(<DatePicker components={{ Nav }} />);
    await open(user);

    expect(screen.getByRole("button", { name: "Previous month" })).toHaveAttribute("data-direction", "previous");
  });

  it("still moves back in time from the previous control", async () => {
    const { user } = renderArabic();
    await open(user);

    await user.click(screen.getByRole("button", { name: "الشهر السابق" }));

    expect(shownMonth()).toBe("فبراير ٢٠٢٦");
  });

  it("makes the arrow keys follow what the eye sees", async () => {
    const { user } = renderArabic();
    await open(user);
    expect(focusedDate()).toBe("2026-03-12");

    /** The day to the left of the 12th in a mirrored grid is the 13th. */
    await user.keyboard("{ArrowLeft}");
    expect(focusedDate()).toBe("2026-03-13");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(focusedDate()).toBe("2026-03-11");

    /** Up and down are not mirrored. */
    await user.keyboard("{ArrowDown}");
    expect(focusedDate()).toBe("2026-03-18");
  });
});
