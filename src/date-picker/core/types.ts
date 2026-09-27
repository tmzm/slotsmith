/**
 * ISO date
 *
 * A calendar date, as `YYYY-MM-DD`. Never an instant, never zoned: the 12th of
 * March is the 12th of March in every time zone, which is what a birthday, a
 * due date or a booking night actually means.
 *
 * Strings of this shape also sort chronologically, so `<`, `>` and `sort()`
 * compare them correctly without parsing.
 */
export type ISODate = string;

/**
 * Date range
 *
 * A start and an end, either of which may be missing while the range is being
 * picked. Both ends are inclusive.
 */
export interface DateRange {
  /** The first day. */
  from?: ISODate;
  /** The last day. */
  to?: ISODate;
}

/**
 * Week start
 *
 * Which day a week starts on, as `Date.prototype.getDay()` numbers it: `0` is
 * Sunday, `6` is Saturday.
 */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Date picker mode
 *
 * What the picker lets you choose: one date, any number of dates, or a range.
 */
export type DatePickerMode = "single" | "multiple" | "range";

/**
 * Date picker value map
 *
 * The value's shape in each mode. `single` and `range` use `null` for
 * "nothing picked"; `multiple` uses an empty array, so it is always a list.
 */
export interface DatePickerValueMap {
  single: ISODate | null;
  multiple: ISODate[];
  range: DateRange | null;
}

/**
 * Date picker value
 *
 * The value for a mode, or the union of all three when the mode is not known.
 *
 * @typeParam M - The mode.
 */
export type DatePickerValue<M extends DatePickerMode = DatePickerMode> = DatePickerValueMap[M];

/**
 * Date picker preset
 *
 * A shortcut offered under the grid: one date, or one range.
 */
export interface DatePickerPreset {
  /** What the shortcut says. Presets are supplied by the caller, so this is already translated. */
  label: string;
  /** What choosing it picks. */
  value: ISODate | DateRange;
}

/**
 * Calendar day
 *
 * One cell of the month grid.
 */
export interface CalendarDay {
  /** The calendar date. */
  date: ISODate;
  /** The day of the month, for display. */
  day: number;
  /** Whether it belongs to a neighbouring month rather than the one shown. */
  outside: boolean;
  /** Whether it is today. */
  isToday: boolean;
  /** Whether it falls on a Saturday or a Sunday. */
  weekend: boolean;
}
