/**
 * Calendar maths
 *
 * Everything the date picker computes about dates, with no React and no date
 * library. It all works on a plain `YYYY-MM-DD` string, which is the single
 * most important decision in the component: a calendar date is not an
 * instant, so it must never be put through `Date.prototype.toISOString()`.
 *
 * A `Date` is only ever built at local midnight from the string's parts, used
 * for one calculation, and turned back into a string from its local fields.
 * That round trip is exact in every time zone, including the ones fourteen
 * hours either side of UTC.
 */
import type { CalendarDay, DateRange, ISODate, WeekStart } from "./types";

/**
 * To ISO date
 *
 * Formats a date as `YYYY-MM-DD` using its **local** fields.
 *
 * `toISOString()` converts to UTC first, so in any positive-offset zone local
 * midnight lands on the previous day. That single call is the origin of the
 * off-by-one this design exists to avoid.
 *
 * @param date - The date to format.
 * @returns The calendar date.
 *
 * @example
 * ```ts
 * toISODate(new Date(2026, 2, 12)); // "2026-03-12", in every time zone
 * ```
 */
export function toISODate(date: Date): ISODate {
  const year = `${date.getFullYear()}`.padStart(4, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * From ISO date
 *
 * Parses `YYYY-MM-DD` into a local-midnight date.
 *
 * `new Date("2026-03-12")` parses as UTC midnight, which is a different day in
 * any negative-offset zone. Passing the parts to the constructor keeps it local.
 *
 * @param value - The calendar date.
 * @returns The date, or `undefined` when the input is not one.
 *
 * @example
 * ```ts
 * fromISODate("2026-03-12")?.getDate(); // 12, in every time zone
 * fromISODate("12/03/2026"); // undefined
 * ```
 */
export function fromISODate(value: ISODate | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  /** The constructor treats years below 100 as 19xx; set it again to mean what was written. */
  date.setFullYear(Number(match[1]));
  return date;
}

/**
 * Today
 *
 * The current calendar date where the code is running.
 *
 * @returns Today, as `YYYY-MM-DD`.
 */
export const today = (): ISODate => toISODate(new Date());

/**
 * Add days
 *
 * Moves a calendar date by whole days, across month and year boundaries.
 *
 * @param value - The calendar date.
 * @param days - How many days to move; negative moves back.
 * @returns The new calendar date.
 *
 * @example
 * ```ts
 * addDays("2026-02-28", 1); // "2026-03-01"
 * ```
 */
export function addDays(value: ISODate, days: number): ISODate {
  const date = fromISODate(value)!;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Add months
 *
 * Moves a calendar date by whole months, clamping the day so that 31 January
 * plus one month is the last day of February rather than early March.
 *
 * @param value - The calendar date.
 * @param months - How many months to move; negative moves back.
 * @returns The new calendar date.
 *
 * @example
 * ```ts
 * addMonths("2026-01-31", 1); // "2026-02-28"
 * addMonths("2028-01-31", 1); // "2028-02-29"
 * ```
 */
export function addMonths(value: ISODate, months: number): ISODate {
  const date = fromISODate(value)!;
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISODate(date);
}

/**
 * Start of month
 *
 * The first day of the month a date falls in.
 *
 * @param value - The calendar date.
 * @returns The 1st of that month.
 */
export const startOfMonth = (value: ISODate): ISODate => `${value.slice(0, 7)}-01`;

/**
 * Month start
 *
 * The 1st of a month, from its year and its index.
 *
 * @param year - The full year.
 * @param monthIndex - `0` for January.
 * @returns That month's 1st.
 */
export function monthStart(year: number, monthIndex: number): ISODate {
  const date = new Date(2000, monthIndex, 1);
  date.setFullYear(year + Math.floor(monthIndex / 12));
  return toISODate(date);
}

/**
 * Same month
 *
 * Whether two dates fall in the same month of the same year.
 *
 * @param a - One calendar date.
 * @param b - Another.
 * @returns `true` when their year and month match.
 */
export const isSameMonth = (a: ISODate, b: ISODate): boolean => a.slice(0, 7) === b.slice(0, 7);

/**
 * Start of week
 *
 * The first day of the week a date falls in.
 *
 * @param value - The calendar date.
 * @param weekStartsOn - The first day of the week.
 * @returns The calendar date that starts that week.
 */
export function startOfWeek(value: ISODate, weekStartsOn: WeekStart = 0): ISODate {
  const weekday = fromISODate(value)!.getDay();
  return addDays(value, -((weekday - weekStartsOn + 7) % 7));
}

/**
 * Clamp date
 *
 * Keeps a date inside optional bounds.
 *
 * @param value - The calendar date.
 * @param min - The earliest allowed date, if any.
 * @param max - The latest allowed date, if any.
 * @returns The date, or the bound it went past.
 */
export function clampDate(value: ISODate, min?: ISODate, max?: ISODate): ISODate {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/**
 * Is within
 *
 * Whether a date falls inside a range, inclusive of both ends. A range missing
 * either end contains nothing.
 *
 * @param value - The calendar date.
 * @param range - The range.
 * @returns `true` when `from <= value <= to`.
 */
export function isWithin(value: ISODate, range: DateRange): boolean {
  if (!range.from || !range.to) return false;
  return value >= range.from && value <= range.to;
}

/**
 * Build month
 *
 * The six-week grid for a month, including the leading and trailing days that
 * complete the first and last weeks.
 *
 * Six weeks always, rather than five or six, so the popup does not change
 * height as you page through months.
 *
 * @param month - Any date within the month to build.
 * @param weekStartsOn - The first day of the week.
 * @returns Six weeks of seven days.
 */
export function buildMonth(month: ISODate, weekStartsOn: WeekStart = 0): CalendarDay[][] {
  const anchor = fromISODate(month)!;
  const shownMonth = anchor.getMonth();
  const first = startOfWeek(startOfMonth(month), weekStartsOn);
  const now = today();

  const weeks: CalendarDay[][] = [];
  const cursor = fromISODate(first)!;

  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];
    for (let index = 0; index < 7; index += 1) {
      const iso = toISODate(cursor);
      const weekday = cursor.getDay();
      days.push({
        date: iso,
        day: cursor.getDate(),
        outside: cursor.getMonth() !== shownMonth,
        isToday: iso === now,
        weekend: weekday === 0 || weekday === 6,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }

  return weeks;
}

/**
 * Grid calendar
 *
 * The calendar every name and date is formatted in. The grid is Gregorian, and
 * `Intl` would otherwise follow the locale's own default, which is Persian for
 * `fa-IR` and Hijri for some Arabic regions: the month names would then not
 * match the days under them. Numbering systems are still left to the locale.
 */
const GRID_CALENDAR = "gregory";

/**
 * Locale week start
 *
 * The day a locale's calendars start their week on: Sunday in the United
 * States, Monday in most of Europe, Saturday in Egypt.
 *
 * Read from `Intl.Locale`'s week info where the runtime has it, and Sunday
 * where it does not, so an older browser still gets a working grid.
 *
 * @param locale - A BCP 47 tag.
 * @returns The first day of the week.
 *
 * @example
 * ```ts
 * localeWeekStart("en-GB"); // 1
 * localeWeekStart("ar-EG"); // 6
 * ```
 */
export function localeWeekStart(locale: string): WeekStart {
  try {
    const tag = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    /** Some engines shipped the getter before the method; `firstDay` is 1 (Monday) to 7 (Sunday). */
    const info = tag.getWeekInfo?.() ?? tag.weekInfo;
    return info ? ((info.firstDay % 7) as WeekStart) : 0;
  } catch {
    return 0;
  }
}

/**
 * Weekday names
 *
 * The weekday labels in the locale's own language and order.
 *
 * `Intl` already knows every locale's month and day names, so a date library
 * is not needed for this and neither is a translation file.
 *
 * The default is the `narrow` form, which is a single character in every
 * language. `short` is a whole word in some of them — Arabic renders
 * Wednesday as a five-letter word — which cannot fit a column sized to a day
 * cell without either clipping the label or breaking the alignment between
 * the header and the grid beneath it.
 *
 * The anchor dates are UTC and formatted in UTC. Formatting them in the local
 * zone would move them back a day anywhere west of Greenwich, and every label
 * would shift by one.
 *
 * @param locale - A BCP 47 tag, e.g. `ar-SA`.
 * @param weekStartsOn - The first day of the week.
 * @param style - How long the labels should be.
 * @returns Seven labels, starting with `weekStartsOn`.
 */
export function weekdayNames(
  locale: string,
  weekStartsOn: WeekStart = 0,
  style: "narrow" | "short" | "long" = "narrow",
): string[] {
  // TODO(calendars): Hijri and Persian calendar grids.
  const format = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC", calendar: GRID_CALENDAR });
  /** 4 Jan 1970 was a Sunday, so it anchors the week cleanly. */
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(1970, 0, 4 + ((index + weekStartsOn) % 7)))),
  );
}

/**
 * Month names
 *
 * The twelve month names in the locale's own language. Anchored and
 * formatted in UTC for the same reason as {@link weekdayNames}.
 *
 * @param locale - A BCP 47 tag.
 * @param style - How long the names should be.
 * @returns Twelve names, January first.
 */
export function monthNames(locale: string, style: "long" | "short" = "long"): string[] {
  // TODO(calendars): Hijri and Persian calendar grids.
  const format = new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC", calendar: GRID_CALENDAR });
  return Array.from({ length: 12 }, (_, index) => format.format(new Date(Date.UTC(2021, index, 1))));
}

/**
 * Format date
 *
 * A calendar date as text, in the caller's locale.
 *
 * @param value - The calendar date.
 * @param locale - A BCP 47 tag.
 * @param options - Any `Intl.DateTimeFormat` options.
 * @returns The formatted date, or an empty string.
 *
 * @example
 * ```ts
 * formatDate("2026-03-12", "en-US"); // "Mar 12, 2026"
 * formatDate("2026-03-12", "ar-EG", { dateStyle: "full" }); // "الخميس، ١٢ مارس ٢٠٢٦"
 * ```
 */
export function formatDate(
  value: ISODate | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = fromISODate(value);
  // TODO(calendars): Hijri and Persian calendar grids.
  return date ? new Intl.DateTimeFormat(locale, { ...options, calendar: GRID_CALENDAR }).format(date) : "";
}
