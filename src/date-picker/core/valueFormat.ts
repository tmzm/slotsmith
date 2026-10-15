import type { ISODate } from "./types";

/**
 * Value codec
 *
 * Your own way to write a day as the value: `format` turns a calendar day
 * (`YYYY-MM-DD`) into your text, `parse` reads your text back, returning
 * `null` for text that is not a day.
 *
 * @example
 * ```ts
 * const unix: DateValueCodec = {
 *   format: (day) => String(Date.parse(`${day}T00:00:00Z`) / 1000),
 *   parse: (text) => new Date(Number(text) * 1000).toISOString().slice(0, 10),
 * };
 * ```
 */
export interface DateValueCodec {
  format(day: ISODate): string;
  parse(text: string): ISODate | null;
}

/**
 * Value format
 *
 * How the date picker writes the days it exchanges with you: its value,
 * `defaultValue`, `onChange`, `minDate`, `maxDate`, the presets and the
 * date `disabledDates` is asked about.
 *
 * - A pattern of `YYYY`, `MM`, `M`, `DD` and `D` (the others are kept as
 *   they are): `"YYYY-MM-DD"`, the default, `"DD/MM/YYYY"`, `"M/D/YYYY"`.
 * - `"iso-datetime"`: the instant the day starts in the `timeZone`, such as
 *   `"2026-03-12T00:00:00+09:00"`. Any ISO instant is read as the day it
 *   falls on in that zone.
 * - Your own {@link DateValueCodec}.
 */
export type DateValueFormat = string | DateValueCodec;

/** The default value format: the calendar day itself. */
export const ISO_FORMAT = "YYYY-MM-DD";

const TOKENS = /YYYY|MM|M|DD|D/g;
const OFFSET = /^([+-])(\d{2}):?(\d{2})$/;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** Whether a year, month and day name a day on the calendar (rejects February 31st). */
function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** A calendar day from its parts. */
const toDay = (year: number, month: number, day: number): ISODate => `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

/**
 * Offset of
 *
 * @param instant - Milliseconds since the epoch.
 * @param timeZone - An IANA zone, `"UTC"` or an offset such as `"+09:00"`; the browser's own when left out.
 * @returns The zone's offset from UTC at that instant, in minutes.
 */
export function offsetOf(instant: number, timeZone?: string): number {
  if (!timeZone) return -new Date(instant).getTimezoneOffset();
  const fixed = OFFSET.exec(timeZone);
  if (fixed) return (fixed[1] === "-" ? -1 : 1) * (Number(fixed[2]) * 60 + Number(fixed[3]));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(instant);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  return match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
}

/**
 * Day in zone
 *
 * @param instant - A moment.
 * @param timeZone - The zone whose calendar to read; the browser's own when left out.
 * @returns The calendar day the moment falls on in that zone.
 */
export function dayInZone(instant: Date, timeZone?: string): ISODate {
  const shifted = new Date(instant.getTime() + offsetOf(instant.getTime(), timeZone) * 60_000);
  return toDay(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/**
 * Today in
 *
 * @param timeZone - The zone; the browser's own when left out.
 * @returns Today's calendar day in that zone.
 */
export const todayIn = (timeZone?: string): ISODate => dayInZone(new Date(), timeZone);

/**
 * Start of day
 *
 * @param day - A calendar day.
 * @param timeZone - The zone; the browser's own when left out.
 * @returns The instant the day starts in that zone, in milliseconds, and the zone's offset then, in minutes.
 */
export function startOfDayIn(day: ISODate, timeZone?: string): { instant: number; offset: number } {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  const utc = Date.UTC(year, month - 1, date);
  // The offset at midnight can differ from the offset a few hours earlier (a DST change): settle on the one that holds.
  let offset = offsetOf(utc, timeZone);
  offset = offsetOf(utc - offset * 60_000, timeZone);
  return { instant: utc - offset * 60_000, offset };
}

/** An offset in minutes as `+09:00`. */
const offsetText = (minutes: number) =>
  `${minutes < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;

/**
 * Pattern codec
 *
 * Reads and writes days as a pattern of `YYYY`, `MM`, `M`, `DD` and `D`.
 */
function patternCodec(pattern: string): DateValueCodec {
  const order: string[] = [];
  const source = pattern
    .split(TOKENS)
    .map((literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .reduce((regex, literal, index) => {
      const token = pattern.match(TOKENS)?.[index - 1];
      if (index === 0) return literal;
      order.push(token!);
      const group = token === "YYYY" ? "(\\d{4})" : token!.length === 2 ? "(\\d{2})" : "(\\d{1,2})";
      return regex + group + literal;
    }, "");
  const reader = new RegExp(`^${source}$`);

  return {
    format: (day) => {
      const [year, month, date] = day.split("-").map(Number) as [number, number, number];
      return pattern.replace(TOKENS, (token) =>
        token === "YYYY" ? pad(year, 4) : token === "MM" ? pad(month) : token === "M" ? String(month) : token === "DD" ? pad(date) : String(date),
      );
    },
    parse: (text) => {
      const match = reader.exec(text.trim());
      if (!match) return null;
      const parts: Record<string, number> = {};
      order.forEach((token, index) => (parts[token[0]!] = Number(match[index + 1])));
      const { Y: year, M: month, D: day } = parts;
      if (year === undefined || month === undefined || day === undefined || !isRealDay(year, month, day)) return null;
      return toDay(year, month, day);
    },
  };
}

/**
 * Instant codec
 *
 * Reads and writes days as the ISO instant they start at in a zone.
 */
function instantCodec(timeZone?: string): DateValueCodec {
  return {
    format: (day) => `${day}T00:00:00${offsetText(startOfDayIn(day, timeZone).offset)}`,
    parse: (text) => {
      const time = Date.parse(text);
      return Number.isNaN(time) ? null : dayInZone(new Date(time), timeZone);
    },
  };
}

/**
 * Create value codec
 *
 * @param format - See {@link DateValueFormat}. Defaults to `"YYYY-MM-DD"`.
 * @param timeZone - The zone instants are read and written in.
 * @returns The codec.
 *
 * @example
 * ```ts
 * createValueCodec("DD/MM/YYYY").format("2026-03-12"); // "12/03/2026"
 * createValueCodec("iso-datetime", "Asia/Tokyo").format("2026-03-12"); // "2026-03-12T00:00:00+09:00"
 * ```
 */
export function createValueCodec(format: DateValueFormat = ISO_FORMAT, timeZone?: string): DateValueCodec {
  if (typeof format !== "string") return format;
  if (format === "iso-datetime") return instantCodec(timeZone);
  return patternCodec(format);
}
