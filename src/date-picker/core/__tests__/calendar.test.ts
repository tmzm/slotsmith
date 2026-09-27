import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  buildMonth,
  clampDate,
  formatDate,
  fromISODate,
  isWithin,
  localeWeekStart,
  monthNames,
  monthStart,
  startOfMonth,
  startOfWeek,
  toISODate,
  weekdayNames,
} from "../calendar";

/**
 * Time zones
 *
 * The two inhabited zones furthest from UTC, fourteen hours ahead and eleven
 * behind. A calendar date that survives both survives every zone in between.
 *
 * Node resets its time-zone cache whenever `process.env.TZ` is assigned, so
 * `vi.stubEnv` switches zone mid-file with no separate worker. The first test
 * proves the switch really happened, so the round trips below cannot pass
 * vacuously in the machine's own zone.
 */
const ZONES = [
  { name: "Pacific/Kiritimati", offset: -14 * 60 },
  { name: "Pacific/Pago_Pago", offset: 11 * 60 },
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(ZONES)("calendar dates in $name", ({ name, offset }) => {
  it("runs in that zone", () => {
    vi.stubEnv("TZ", name);
    expect(new Date(2026, 2, 12).getTimezoneOffset()).toBe(offset);
  });

  it("round-trips a date through Date without moving it", () => {
    vi.stubEnv("TZ", name);
    for (const iso of ["2026-01-01", "2026-03-12", "2026-12-31", "2028-02-29"]) {
      expect(toISODate(fromISODate(iso)!)).toBe(iso);
    }
  });

  it("reads a date as local midnight, not UTC midnight", () => {
    vi.stubEnv("TZ", name);
    const date = fromISODate("2026-03-12")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 12, 0]);
  });

  it("formats with local fields, where toISOString would slip a day", () => {
    vi.stubEnv("TZ", name);
    const midnight = new Date(2026, 2, 12);
    expect(toISODate(midnight)).toBe("2026-03-12");
    /** East of Greenwich, local midnight is still the previous day in UTC. */
    if (offset < 0) expect(midnight.toISOString().slice(0, 10)).toBe("2026-03-11");
  });

  it("names weekdays and months without drifting a day", () => {
    vi.stubEnv("TZ", name);
    expect(weekdayNames("en-US", 0, "long")[0]).toBe("Sunday");
    expect(monthNames("en-US")[0]).toBe("January");
  });

  it("builds the same grid", () => {
    vi.stubEnv("TZ", name);
    const weeks = buildMonth("2026-03-01", 0);
    expect(weeks[0]![0]!.date).toBe("2026-03-01");
    expect(weeks[5]![6]!.date).toBe("2026-04-11");
  });
});

describe("parsing", () => {
  it("rejects what is not a calendar date", () => {
    expect(fromISODate("12/03/2026")).toBeUndefined();
    expect(fromISODate("")).toBeUndefined();
    expect(fromISODate(null)).toBeUndefined();
  });

  it("keeps years below 100 as written", () => {
    expect(toISODate(fromISODate("0099-06-15")!)).toBe("0099-06-15");
  });
});

describe("arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("clamps 31 January plus a month to the end of February", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("adds whole years as twelve months", () => {
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
    expect(addMonths("2026-05-10", -12)).toBe("2025-05-10");
  });

  it("finds the month's first day and a month's start from its parts", () => {
    expect(startOfMonth("2026-03-12")).toBe("2026-03-01");
    expect(monthStart(2026, 0)).toBe("2026-01-01");
    expect(monthStart(2026, 12)).toBe("2027-01-01");
    expect(monthStart(2026, -1)).toBe("2025-12-01");
  });

  it("finds the start of a week for any first day", () => {
    /** 12 March 2026 is a Thursday. */
    expect(startOfWeek("2026-03-12", 0)).toBe("2026-03-08");
    expect(startOfWeek("2026-03-12", 1)).toBe("2026-03-09");
    expect(startOfWeek("2026-03-12", 6)).toBe("2026-03-07");
  });

  it("clamps into optional bounds", () => {
    expect(clampDate("2026-03-12", "2026-04-01")).toBe("2026-04-01");
    expect(clampDate("2026-03-12", undefined, "2026-03-10")).toBe("2026-03-10");
    expect(clampDate("2026-03-12")).toBe("2026-03-12");
  });

  it("counts both ends of a range, and nothing in a half range", () => {
    expect(isWithin("2026-03-10", { from: "2026-03-10", to: "2026-03-12" })).toBe(true);
    expect(isWithin("2026-03-12", { from: "2026-03-10", to: "2026-03-12" })).toBe(true);
    expect(isWithin("2026-03-13", { from: "2026-03-10", to: "2026-03-12" })).toBe(false);
    expect(isWithin("2026-03-10", { from: "2026-03-10" })).toBe(false);
  });
});

describe("the month grid", () => {
  it("is always six weeks of seven days", () => {
    for (const month of ["2026-02-01", "2015-02-01", "2026-08-01", "2026-03-01"]) {
      for (const start of [0, 1, 6] as const) {
        const weeks = buildMonth(month, start);
        expect(weeks).toHaveLength(6);
        for (const week of weeks) expect(week).toHaveLength(7);
      }
    }
  });

  it("starts each row on the chosen day", () => {
    const weeks = buildMonth("2026-03-01", 6);
    for (const week of weeks) expect(fromISODate(week[0]!.date)!.getDay()).toBe(6);
  });

  it("marks the neighbouring months' days as outside", () => {
    const days = buildMonth("2026-03-01", 1).flat();
    expect(days.filter((day) => !day.outside)).toHaveLength(31);
    expect(days[0]).toMatchObject({ date: "2026-02-23", outside: true });
  });

  it("marks today and weekends", () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 12, 10) });
    const days = buildMonth("2026-03-01").flat();
    vi.useRealTimers();

    expect(days.filter((day) => day.isToday).map((day) => day.date)).toEqual(["2026-03-12"]);
    expect(days.find((day) => day.date === "2026-03-14")!.weekend).toBe(true);
    expect(days.find((day) => day.date === "2026-03-12")!.weekend).toBe(false);
  });
});

describe("locale names", () => {
  it("starts an Egyptian week on Saturday when asked to", () => {
    const names = weekdayNames("ar-EG", 6, "long");
    expect(names[0]).toBe("السبت");
    expect(names[6]).toBe("الجمعة");
  });

  it("gives single-character headers by default", () => {
    for (const label of weekdayNames("en-US")) expect(label).toHaveLength(1);
  });

  it("names the months in the locale's language", () => {
    expect(monthNames("ar-EG")[2]).toBe("مارس");
    expect(monthNames("en-US", "short")[2]).toBe("Mar");
  });

  it("names Gregorian months where the locale's own calendar is another", () => {
    const saudi = monthNames("ar-SA");
    expect(saudi).toHaveLength(12);
    expect(saudi[0]).toBe("يناير");

    const iranian = monthNames("fa-IR");
    expect(iranian).toHaveLength(12);
    expect(iranian[0]).toBe("ژانویه");
  });

  it("formats a date on the Gregorian calendar in every locale", () => {
    expect(formatDate("2026-03-05", "fa-IR")).toBe("۵ مارس ۲۰۲۶");
  });

  it("reads each locale's own first day of the week", () => {
    expect(localeWeekStart("en-US")).toBe(0);
    expect(localeWeekStart("en-GB")).toBe(1);
    expect(localeWeekStart("ar-EG")).toBe(6);
    expect(localeWeekStart("not a locale")).toBe(0);
  });

  it("formats a date for the trigger", () => {
    expect(formatDate("2026-03-12", "en-US")).toBe("Mar 12, 2026");
    expect(formatDate(null, "en-US")).toBe("");
  });
});
