import type { DateRange, ISODate } from "./types";

/**
 * Input codec
 *
 * How the date picker's text field writes and reads a day: the locale's
 * numeric order (`MM/DD/YYYY` in en-US, `DD.MM.YYYY` in German,
 * `YYYY/MM/DD` in Japanese), always in Latin digits so it can be typed on
 * any keyboard.
 */
export interface InputCodec {
  /** The pattern, such as `"MM/DD/YYYY"`; the field's placeholder. */
  pattern: string;
  /** A calendar day as the field shows it. */
  format(day: ISODate): string;
  /** Typed text as a calendar day, or `null` when it is not one. */
  parse(text: string): ISODate | null;
}

/** Marks that steer bidirectional text; `Intl` puts them around the separators in some languages. */
const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;

/** Every digit `Intl` may write or a keyboard may type, mapped to its Latin value. */
const DIGIT_BLOCKS = [0x0660, 0x06f0, 0x0966, 0xff10];

/**
 * Latin digits
 *
 * @param text - Text in any of the common digit systems.
 * @returns The same text with Latin digits.
 */
function latinDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹०-९０-９]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const block = DIGIT_BLOCKS.find((start) => code >= start && code <= start + 9)!;
    return String(code - block);
  });
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** Whether a year, month and day name a day on the calendar (rejects February 31st). */
function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Create input codec
 *
 * @param locale - A BCP 47 tag.
 * @returns The field's pattern, writer and reader for that locale.
 *
 * @example
 * ```ts
 * createInputCodec("de").format("2026-03-12"); // "12.03.2026"
 * createInputCodec("en-US").parse("3/12/2026"); // "2026-03-12"
 * ```
 */
export function createInputCodec(locale: string): InputCodec {
  // TODO(calendars): read the order of the chosen calendar once the grid has other calendars.
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    calendar: "gregory",
    numberingSystem: "latn",
  }).formatToParts(new Date(2026, 10, 22));

  const order: ("year" | "month" | "day")[] = [];
  let pattern = "";
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      order.push(part.type);
      pattern += part.type === "year" ? "YYYY" : part.type === "month" ? "MM" : "DD";
    } else if (part.type === "literal") {
      pattern += part.value.replace(BIDI_MARKS, "");
    }
  }
  if (order.length !== 3) {
    order.splice(0, order.length, "year", "month", "day");
    pattern = "YYYY-MM-DD";
  }

  return {
    pattern,
    format: (day) => {
      const [year, month, date] = day.split("-").map(Number) as [number, number, number];
      return pattern.replace(/YYYY|MM|DD/g, (token) => (token === "YYYY" ? pad(year, 4) : token === "MM" ? pad(month) : pad(date)));
    },
    parse: (text) => {
      // The numbers in the locale's order, whatever separates them: "3/12/2026", "3-12-2026" and "3 12 2026" all read.
      const numbers = latinDigits(text).match(/\d+/g);
      if (!numbers || numbers.length !== 3) return null;
      const parts: Record<string, string> = {};
      order.forEach((type, index) => (parts[type] = numbers[index]!));
      if (parts.year!.length !== 4 || parts.month!.length > 2 || parts.day!.length > 2) return null;
      const [year, month, day] = [Number(parts.year), Number(parts.month), Number(parts.day)];
      return isRealDay(year, month, day) ? `${pad(year, 4)}-${pad(month)}-${pad(day)}` : null;
    },
  };
}

/** What separates a range's ends in the field. */
export const RANGE_SEPARATOR = " – ";

/** What separates several days in the field. */
export const LIST_SEPARATOR = ", ";

/**
 * Format input
 *
 * @param mode - The picker's mode.
 * @param value - The value in that mode's shape, as calendar days.
 * @param codec - The field's codec.
 * @returns The field's text for the value.
 */
export function formatInput(mode: "single" | "multiple" | "range", value: unknown, codec: InputCodec): string {
  if (mode === "multiple") return (Array.isArray(value) ? (value as ISODate[]) : []).map(codec.format).join(LIST_SEPARATOR);
  if (mode === "range") {
    const range = (value as DateRange | null) ?? {};
    if (!range.from) return "";
    return `${codec.format(range.from)}${RANGE_SEPARATOR}${range.to ? codec.format(range.to) : ""}`;
  }
  return typeof value === "string" && value ? codec.format(value) : "";
}

/**
 * Parse input
 *
 * Reads the field's text in the mode's shape. Empty text is no value.
 *
 * @param mode - The picker's mode.
 * @param text - What was typed.
 * @param codec - The field's codec.
 * @returns The value as calendar days, or `undefined` when the text does not read as one.
 */
export function parseInput(
  mode: "single" | "multiple" | "range",
  text: string,
  codec: InputCodec,
): ISODate | ISODate[] | DateRange | null | undefined {
  const trimmed = text.trim();
  if (mode === "multiple") {
    if (!trimmed) return [];
    const days = trimmed.split(/\s*[,;،]\s*/).filter(Boolean).map(codec.parse);
    return days.every((day): day is ISODate => day !== null) ? [...new Set(days)].sort() : undefined;
  }
  if (mode === "range") {
    if (!trimmed) return null;
    // An en or em dash, or a hyphen with spaces around it, so a "2026-03-12" end is not split.
    const [fromText = "", toText = "", ...extra] = trimmed.split(/\s*[–—]\s*|\s+-\s+/);
    if (extra.length) return undefined;
    const from = codec.parse(fromText);
    const to = toText.trim() ? codec.parse(toText) : undefined;
    if (!from || to === null) return undefined;
    return to && to < from ? { from: to, to: from } : { from, to };
  }
  if (!trimmed) return null;
  return codec.parse(trimmed) ?? undefined;
}
