"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useControllableState } from "../../shared/useControllableState";
import {
  addDays,
  addMonths,
  buildMonth,
  clampDate,
  fromISODate,
  isSameMonth,
  isWithin,
  localeWeekStart,
  monthNames,
  monthStart,
  startOfMonth,
  startOfWeek,
  today,
  weekdayNames,
} from "./calendar";
import type {
  CalendarDay,
  DatePickerMode,
  DatePickerValue,
  DateRange,
  ISODate,
  WeekStart,
} from "./types";

/**
 * Isomorphic layout effect
 *
 * A layout effect in the browser, so opening the popup resets the month and
 * reads the direction before anything is painted, and a plain effect on the
 * server, where layout effects only produce a warning.
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** How many years either side of the shown one the year list offers when no bounds are given. */
const YEAR_SPAN = 10;

/**
 * useDatePicker options
 *
 * Everything the engine needs. `<DatePicker>` passes its props straight
 * through; the value's shape follows `mode`.
 *
 * @typeParam M - The mode.
 */
export interface UseDatePickerOptions<M extends DatePickerMode = DatePickerMode> {
  /** What can be picked. Defaults to `single`. */
  mode?: M;
  /** The picked value. Pass it to control the component. */
  value?: DatePickerValue<M>;
  /** The picked value while uncontrolled. */
  defaultValue?: DatePickerValue<M>;
  /** Told about every change to the value, controlled or not. */
  onChange?: (value: DatePickerValue<M>) => void;

  /** Whether the popup is open. */
  open?: boolean;
  /** Whether the popup starts open. */
  defaultOpen?: boolean;
  /** Told when the popup opens or closes. */
  onOpenChange?: (open: boolean) => void;

  /** A BCP 47 tag. Month and day names come from `Intl`, so there is nothing to translate. Defaults to `en-US`. */
  locale?: string;
  /** The first column of the grid. Defaults to the locale's own first day. */
  weekStartsOn?: WeekStart;
  /**
   * How long the column headers are. `narrow` is a single character in every
   * language, and is the only form that reliably fits a square day column.
   * Defaults to `narrow`.
   */
  weekdayFormat?: "narrow" | "short" | "long";
  /** Nothing before this date can be picked, and the calendar does not page past it. */
  minDate?: ISODate;
  /** Nothing after this date can be picked, and the calendar does not page past it. */
  maxDate?: ISODate;
  /** Blocks individual dates — weekends, holidays, days already booked. They stay focusable. */
  disabledDates?: (date: ISODate) => boolean;

  /** Whether the clear control is offered. Defaults to `true`. */
  clearable?: boolean;
  /** Disables the whole control. Separate from `disabledDates`. */
  disabled?: boolean;
  /** Whether picking closes the popup. Defaults to `true` in single mode and `false` otherwise. */
  closeOnSelect?: boolean;
  /** Told when focus leaves the whole control, for form libraries. */
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
}

/**
 * Day state
 *
 * Everything that is true about one day cell right now.
 */
export interface DatePickerDayState {
  /** It is picked, or is either end of the picked range. */
  selected: boolean;
  /** It sits inside a complete picked range, ends included. */
  inRange: boolean;
  /** It sits between the range's start and the hovered or focused day while the end is still unset. */
  inPreview: boolean;
  /** It is the range's first day. */
  rangeStart: boolean;
  /** It is the range's last day. */
  rangeEnd: boolean;
  /** It cannot be picked: outside `minDate` / `maxDate`, or blocked by `disabledDates`. */
  disabled: boolean;
  /** It is the one day in the grid that takes focus. */
  focused: boolean;
}

/**
 * Date picker model
 *
 * What the engine exposes: the resolved state, the actions, and prop getters
 * for the parts that need wiring.
 *
 * @typeParam M - The mode.
 */
export interface DatePickerModel<M extends DatePickerMode = DatePickerMode> {
  /** What can be picked. */
  mode: M;
  /** The picked value, in the mode's shape. */
  value: DatePickerValue<M>;
  /** Every picked date as a sorted list, whatever the mode. A range gives its ends. */
  selectedDates: ISODate[];
  /** The picked range in range mode, or `{}`. */
  range: DateRange;
  /** Whether anything is picked. */
  hasValue: boolean;

  /** Whether the popup is open. */
  open: boolean;
  /** Opens or closes it. Opening does nothing while disabled. */
  setOpen: (open: boolean) => void;

  /** The month on screen, as the 1st of that month. It is not the selection. */
  month: ISODate;
  /** Shows the month a date falls in, kept inside `minDate` / `maxDate`. */
  setMonth: (month: ISODate) => void;
  /** Shows the previous month. */
  showPreviousMonth: () => void;
  /** Shows the next month. */
  showNextMonth: () => void;
  /** Shows another month of the shown year, `0` for January. */
  setMonthIndex: (monthIndex: number) => void;
  /** Shows the same month of another year. */
  setYear: (year: number) => void;
  /** Whether there is an allowed month before the one shown. */
  canGoPrevious: boolean;
  /** Whether there is an allowed month after the one shown. */
  canGoNext: boolean;
  /** The shown month, `0` for January. */
  monthIndex: number;
  /** The shown year. */
  year: number;
  /** Every month name in the locale, January first. */
  months: string[];
  /** The years the caption offers: the bounds when given, else ten either side of the shown year. */
  years: number[];
  /** Six weeks of seven days for the shown month. */
  weeks: CalendarDay[][];
  /** The column headers in the locale, in display order, in the chosen `weekdayFormat`. */
  weekdays: string[];
  /** The same headers as full names, for assistive technology. */
  weekdayNames: string[];
  /** The shown month and year as one phrase, e.g. "March 2026". */
  monthCaption: string;

  /** The one day in the grid that is tabbable and receives focus. */
  activeDate: ISODate;
  /** Moves the active day and focus to a date, paging the month if needed. Kept inside the bounds. */
  focusDate: (date: ISODate) => void;
  /** Where the range preview currently ends, if one is showing. */
  previewEnd?: ISODate;

  /** Whether a date cannot be picked. */
  isDateDisabled: (date: ISODate) => boolean;
  /** Everything that is true about a day cell. */
  getDayState: (date: ISODate) => DatePickerDayState;
  /** A date spelled out in full, for a day's accessible name. */
  formatFullDate: (date: ISODate) => string;

  /** Picks a date: sets it, toggles it, or sets a range end, depending on the mode. */
  pick: (date: ISODate) => void;
  /** Empties the selection. */
  clear: () => void;
  /** Applies a preset. Its shape is converted to the mode's. */
  applyPreset: (value: ISODate | DateRange) => void;
  /** Shows today's month and makes today the active day, without picking it. */
  goToToday: () => void;

  /** The locale the names come from. */
  locale: string;
  /** The first column of the grid. */
  weekStartsOn: WeekStart;
  /** Whether nothing is interactive. */
  disabled: boolean;
  /** Whether the clear control should render. */
  showClear: boolean;
  /** Whether the control is laid out right to left, read when the popup opens. */
  rtl: boolean;

  /** Stable ids for the aria wiring. */
  ids: { root: string; trigger: string; popup: string; grid: string };
  /** The whole control, for the outside-click and focus-leaving checks. */
  rootRef: RefObject<HTMLElement | null>;
  /** The trigger, which focus returns to when the popup closes. */
  triggerRef: RefObject<HTMLElement | null>;

  /** Props for the `Root` part. */
  getRootProps: () => Record<string, unknown>;
  /** Props for the `Trigger` part. */
  getTriggerProps: () => Record<string, unknown>;
  /** Props for the `Popup` part. */
  getPopupProps: () => Record<string, unknown>;
  /** Props for the `Calendar` part, the `role="grid"` element. */
  getGridProps: () => Record<string, unknown>;
  /** Props for the `role="gridcell"` wrapper around one day. */
  getCellProps: (day: CalendarDay) => Record<string, unknown>;
  /** Props for one `Day` part. */
  getDayProps: (day: CalendarDay) => Record<string, unknown>;
}

/**
 * To list
 *
 * The selection as a sorted list of dates, whatever the mode.
 *
 * @param mode - The mode.
 * @param value - The value in that mode's shape.
 * @returns The picked dates.
 */
function toList(mode: DatePickerMode, value: unknown): ISODate[] {
  if (mode === "multiple") return Array.isArray(value) ? [...(value as ISODate[])].sort() : [];
  if (mode === "range") {
    const range = (value as DateRange | null) ?? {};
    return [range.from, range.to].filter(Boolean) as ISODate[];
  }
  return typeof value === "string" && value ? [value] : [];
}

/**
 * Right to left
 *
 * Whether an element is laid out right to left, read from its resolved style
 * rather than from a prop, because direction is usually set once on an
 * ancestor. This is the same source the stylesheets' logical properties
 * follow, so the keyboard and the layout can never disagree.
 *
 * @param element - The element to ask about.
 * @returns `true` in a right-to-left context.
 */
function isRightToLeft(element: Element | null): boolean {
  if (!element || typeof getComputedStyle === "undefined") return false;
  return getComputedStyle(element).direction === "rtl";
}

/**
 * Days between
 *
 * Every date from one day to another, inclusive, capped at a year so a
 * careless preset cannot build an enormous list.
 *
 * @param range - The range to expand.
 * @returns The dates in order.
 */
function daysBetween(range: DateRange): ISODate[] {
  if (!range.from) return [];
  const end = range.to ?? range.from;
  const dates: ISODate[] = [];
  for (let date = range.from; date <= end && dates.length < 366; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/**
 * useDatePicker
 *
 * The engine behind `<DatePicker>`: the value in all three modes, the shown
 * month, the WAI-ARIA grid keyboard path with a roving tab stop, the range
 * preview, the bounds and the aria wiring — with no opinion about markup.
 * Use it directly to build a shape the component does not cover, such as an
 * inline calendar with no popup.
 *
 * Values are `YYYY-MM-DD` strings throughout, so nothing shifts across a time
 * zone and they go into a form, a URL or a database column unchanged.
 *
 * @typeParam M - The mode.
 * @param options - See {@link UseDatePickerOptions}.
 * @returns See {@link DatePickerModel}.
 *
 * @example
 * ```tsx
 * const picker = useDatePicker({ mode: "range", value: range, onChange: setRange, defaultOpen: true });
 * return (
 *   <div {...picker.getRootProps()}>
 *     <div {...picker.getGridProps()}>
 *       {picker.weeks.map((week) => (
 *         <div role="row" key={week[0]!.date}>
 *           {week.map((day) => (
 *             <div key={day.date} {...picker.getCellProps(day)}>
 *               <button {...picker.getDayProps(day)}>{day.day}</button>
 *             </div>
 *           ))}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useDatePicker<M extends DatePickerMode = "single">(
  options: UseDatePickerOptions<M> = {},
): DatePickerModel<M> {
  const {
    mode = "single" as M,
    locale = "en-US",
    weekdayFormat = "narrow",
    minDate,
    maxDate,
    disabledDates,
    clearable = true,
    disabled = false,
    onBlur,
  } = options;
  const closeOnSelect = options.closeOnSelect ?? mode === "single";
  const weekStartsOn = useMemo(
    () => options.weekStartsOn ?? localeWeekStart(locale),
    [options.weekStartsOn, locale],
  );

  const reactId = useId();
  const ids = useMemo(
    () => ({
      root: `${reactId}-root`,
      trigger: `${reactId}-trigger`,
      popup: `${reactId}-popup`,
      grid: `${reactId}-grid`,
    }),
    [reactId],
  );

  const rootRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const empty = (mode === "multiple" ? [] : null) as DatePickerValue<M>;
  const [value, setValue] = useControllableState<DatePickerValue<M>>(
    options.value,
    options.defaultValue ?? empty,
    options.onChange,
  );
  const [open, setOpenState] = useControllableState(options.open, options.defaultOpen ?? false, options.onOpenChange);

  const selectedDates = useMemo(() => toList(mode, value), [mode, value]);
  const range = useMemo<DateRange>(
    () => (mode === "range" ? ((value as DateRange | null) ?? {}) : {}),
    [mode, value],
  );
  const hasValue = selectedDates.length > 0;

  const minMonth = minDate ? startOfMonth(minDate) : undefined;
  const maxMonth = maxDate ? startOfMonth(maxDate) : undefined;

  const [month, setMonthState] = useState<ISODate>(() =>
    startOfMonth(clampDate(selectedDates[0] ?? today(), minDate, maxDate)),
  );
  const [focusedDate, setFocusedDate] = useState<ISODate>(() => selectedDates[0] ?? today());
  const [hoveredDate, setHoveredDate] = useState<ISODate | null>(null);
  const [rtl, setRtl] = useState(false);
  /** Bumped whenever DOM focus should follow the active day; the effect below reacts to it. */
  const [focusRequest, setFocusRequest] = useState(0);

  const inBounds = useCallback(
    (date: ISODate) => (!minDate || date >= minDate) && (!maxDate || date <= maxDate),
    [minDate, maxDate],
  );

  const isDateDisabled = useCallback(
    (date: ISODate) => !inBounds(date) || (disabledDates?.(date) ?? false),
    [inBounds, disabledDates],
  );

  const setMonth = useCallback(
    (next: ISODate) => setMonthState(clampDate(startOfMonth(next), minMonth, maxMonth)),
    [minMonth, maxMonth],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return;
      setOpenState(next);
    },
    [disabled, setOpenState],
  );

  /** Closing after a pick or Escape hands focus back to the trigger, as a dialog should. */
  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  /* ---------------------------------------------------------------- grid */

  const weeks = useMemo(() => buildMonth(month, weekStartsOn), [month, weekStartsOn]);
  const weekdays = useMemo(
    () => weekdayNames(locale, weekStartsOn, weekdayFormat),
    [locale, weekStartsOn, weekdayFormat],
  );
  const fullWeekdays = useMemo(() => weekdayNames(locale, weekStartsOn, "long"), [locale, weekStartsOn]);
  const months = useMemo(() => monthNames(locale), [locale]);

  const monthIndex = Number(month.slice(5, 7)) - 1;
  const year = Number(month.slice(0, 4));

  const years = useMemo(() => {
    const first = Math.min(minDate ? Number(minDate.slice(0, 4)) : year - YEAR_SPAN, year);
    const last = Math.max(maxDate ? Number(maxDate.slice(0, 4)) : year + YEAR_SPAN, year);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  }, [minDate, maxDate, year]);

  const fullDateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "full" }), [locale]);
  const captionFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const formatFullDate = useCallback(
    (date: ISODate) => {
      const parsed = fromISODate(date);
      return parsed ? fullDateFormat.format(parsed) : "";
    },
    [fullDateFormat],
  );
  const monthCaption = captionFormat.format(fromISODate(month)!);

  /**
   * The active day
   *
   * The one cell with `tabIndex={0}`. It is the day focus last moved to when
   * that day is in the shown month; otherwise, after paging with the nav
   * buttons or the caption, the first sensible day of the new month: a picked
   * one, then today, then the 1st — each only if it is inside the bounds.
   */
  const activeDate = useMemo(() => {
    if (isSameMonth(focusedDate, month) && inBounds(focusedDate)) return focusedDate;
    const picked = selectedDates.find((date) => isSameMonth(date, month) && inBounds(date));
    if (picked) return picked;
    const now = today();
    if (isSameMonth(now, month) && inBounds(now)) return now;
    return clampDate(month, minDate, maxDate);
  }, [focusedDate, month, inBounds, selectedDates, minDate, maxDate]);

  const focusDate = useCallback(
    (date: ISODate) => {
      const next = clampDate(date, minDate, maxDate);
      setFocusedDate(next);
      if (!isSameMonth(next, month)) setMonthState(startOfMonth(next));
      setFocusRequest((count) => count + 1);
    },
    [minDate, maxDate, month],
  );

  /** DOM focus follows the active day whenever something asked it to. */
  useEffect(() => {
    if (!open || focusRequest === 0) return;
    /** Looked up by id, so a replacement popup that portals out of the root still works. */
    const grid = document.getElementById(ids.grid) ?? rootRef.current;
    const cell = grid?.querySelector<HTMLElement>(`[data-date="${activeDate}"]`);
    cell?.focus({ preventScroll: true });
    // Only a new request moves focus; a re-render alone must not steal it back from the caption or footer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  /**
   * Opening
   *
   * Shows the month of the picked date, else today's, and puts focus on that
   * day — before the first paint, so the popup never flashes the month it
   * showed last time. Direction is read here too, while the popup is known to
   * be mounted inside its real context.
   */
  const wasOpen = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (open && !wasOpen.current) {
      const start = selectedDates[0] ?? today();
      setFocusedDate(start);
      setMonthState(startOfMonth(clampDate(start, minDate, maxDate)));
      setRtl(isRightToLeft(rootRef.current));
      setFocusRequest((count) => count + 1);
    }
    if (!open && wasOpen.current) setHoveredDate(null);
    wasOpen.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** A pointer going down outside the control closes the popup. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen]);

  /* ------------------------------------------------------------- actions */

  const pick = useCallback(
    (date: ISODate) => {
      if (disabled || isDateDisabled(date)) return;
      setFocusedDate(date);

      if (mode === "multiple") {
        setValue((previous) => {
          const list = toList("multiple", previous);
          const next = list.includes(date) ? list.filter((entry) => entry !== date) : [...list, date].sort();
          return next as DatePickerValue<M>;
        });
        return;
      }

      if (mode === "range") {
        /** A complete range, or a click before the start, begins a new one. */
        const starting = !range.from || !!range.to || date < range.from;
        setValue((starting ? { from: date } : { from: range.from, to: date }) as DatePickerValue<M>);
        setHoveredDate(null);
        if (!starting && closeOnSelect) closeAndReturnFocus();
        return;
      }

      setValue(date as DatePickerValue<M>);
      if (closeOnSelect) closeAndReturnFocus();
    },
    [disabled, isDateDisabled, mode, range, setValue, closeOnSelect, closeAndReturnFocus],
  );

  const clear = useCallback(() => {
    if (disabled) return;
    setValue(empty);
    setHoveredDate(null);
    // `empty` is rebuilt every render but only its shape matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, setValue, mode]);

  const applyPreset = useCallback(
    (preset: ISODate | DateRange) => {
      if (disabled) return;
      const asRange: DateRange = typeof preset === "string" ? { from: preset, to: preset } : preset;

      let next: unknown;
      if (mode === "single") next = asRange.from ?? null;
      else if (mode === "range") next = { ...asRange };
      else next = daysBetween(asRange);
      setValue(next as DatePickerValue<M>);

      if (asRange.from) {
        setFocusedDate(asRange.from);
        setMonth(asRange.from);
      }
      if (closeOnSelect) closeAndReturnFocus();
    },
    [disabled, mode, setValue, setMonth, closeOnSelect, closeAndReturnFocus],
  );

  const goToToday = useCallback(() => {
    const now = clampDate(today(), minDate, maxDate);
    setFocusedDate(now);
    setMonth(now);
  }, [minDate, maxDate, setMonth]);

  const showPreviousMonth = useCallback(() => setMonth(addMonths(month, -1)), [month, setMonth]);
  const showNextMonth = useCallback(() => setMonth(addMonths(month, 1)), [month, setMonth]);
  const setMonthIndex = useCallback((index: number) => setMonth(monthStart(year, index)), [year, setMonth]);
  const setYear = useCallback((next: number) => setMonth(monthStart(next, monthIndex)), [monthIndex, setMonth]);

  /* ------------------------------------------------------------- preview */

  /**
   * While a range has a start but no end, the days between the start and the
   * hovered day — or the focused one, for keyboard users — are previewed.
   * Nothing is previewed before the start, because a click there restarts
   * the range instead of ending it.
   */
  const previewEnd = useMemo(() => {
    if (mode !== "range" || !range.from || range.to || !open) return undefined;
    const end = hoveredDate ?? activeDate;
    return end > range.from ? end : undefined;
  }, [mode, range, open, hoveredDate, activeDate]);

  const getDayState = useCallback(
    (date: ISODate): DatePickerDayState => {
      const isRange = mode === "range";
      return {
        selected: selectedDates.includes(date),
        inRange: isRange && isWithin(date, range),
        inPreview: !!previewEnd && !!range.from && date >= range.from && date <= previewEnd,
        rangeStart: isRange && date === range.from,
        rangeEnd: isRange && date === range.to,
        disabled: isDateDisabled(date),
        focused: date === activeDate,
      };
    },
    [mode, selectedDates, range, previewEnd, isDateDisabled, activeDate],
  );

  /* ------------------------------------------------------------ keyboard */

  const onTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      /** Keys pressed on a control inside the trigger, such as the clear button, are that control's. */
      if (disabled || event.target !== event.currentTarget) return;
      const { key } = event;

      if (!open && (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp")) {
        event.preventDefault();
        setOpen(true);
      } else if (open && (key === "Enter" || key === " " || key === "Escape")) {
        event.preventDefault();
        setOpen(false);
      }
    },
    [disabled, open, setOpen],
  );

  const onPopupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      /** Handled here, so a dialog the picker sits in does not close as well. */
      event.stopPropagation();
      closeAndReturnFocus();
    },
    [closeAndReturnFocus],
  );

  /**
   * The grid's keyboard path, as the WAI-ARIA date picker dialog pattern
   * describes it. Arrows move by a day or a week, Home and End to the ends of
   * the week, Page Up / Page Down by a month and, with Shift, by a year.
   *
   * Left and right follow what the eye sees: in right-to-left the day to the
   * left is the next one, so the arrows swap.
   */
  const onGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;
      const from = target.closest?.("[data-date]")?.getAttribute("data-date") ?? activeDate;
      const reversed = isRightToLeft(event.currentTarget);
      let next: ISODate;

      switch (event.key) {
        case "ArrowLeft":
          next = addDays(from, reversed ? 1 : -1);
          break;
        case "ArrowRight":
          next = addDays(from, reversed ? -1 : 1);
          break;
        case "ArrowUp":
          next = addDays(from, -7);
          break;
        case "ArrowDown":
          next = addDays(from, 7);
          break;
        case "Home":
          next = startOfWeek(from, weekStartsOn);
          break;
        case "End":
          next = addDays(startOfWeek(from, weekStartsOn), 6);
          break;
        case "PageUp":
          next = addMonths(from, event.shiftKey ? -12 : -1);
          break;
        case "PageDown":
          next = addMonths(from, event.shiftKey ? 12 : 1);
          break;
        case "Enter":
        case " ":
          /** A real button already turns these keys into a click; anything else needs them handled. */
          if (target instanceof HTMLButtonElement) return;
          event.preventDefault();
          pick(from);
          return;
        default:
          return;
      }

      event.preventDefault();
      focusDate(next);
    },
    [activeDate, weekStartsOn, pick, focusDate],
  );

  /** Focus leaving the whole control closes the popup, and is what a form library calls "touched". */
  const onRootBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && rootRef.current?.contains(next)) return;
      if (next) setOpen(false);
      onBlur?.(event);
    },
    [onBlur, setOpen],
  );

  /* -------------------------------------------------------- prop getters */

  const getRootProps = useCallback(
    () => ({
      ref: rootRef,
      "data-mode": mode,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-empty": !hasValue || undefined,
      onBlur: onRootBlur,
    }),
    [mode, open, disabled, hasValue, onRootBlur],
  );

  const getTriggerProps = useCallback(
    () => ({
      ref: triggerRef,
      id: ids.trigger,
      role: "combobox" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-haspopup": "dialog" as const,
      "aria-expanded": open,
      "aria-controls": open ? ids.popup : undefined,
      "aria-disabled": disabled || undefined,
      "data-open": open || undefined,
      "data-disabled": disabled || undefined,
      "data-empty": !hasValue || undefined,
      onClick: () => setOpen(!open),
      onKeyDown: onTriggerKeyDown,
    }),
    [ids, disabled, open, hasValue, setOpen, onTriggerKeyDown],
  );

  const getPopupProps = useCallback(
    () => ({
      id: ids.popup,
      role: "dialog" as const,
      "aria-modal": false,
      onKeyDown: onPopupKeyDown,
    }),
    [ids.popup, onPopupKeyDown],
  );

  const getGridProps = useCallback(
    () => ({
      id: ids.grid,
      role: "grid" as const,
      "aria-label": monthCaption,
      "aria-multiselectable": mode === "single" ? undefined : true,
      onKeyDown: onGridKeyDown,
      onPointerLeave: () => setHoveredDate(null),
    }),
    [ids.grid, monthCaption, mode, onGridKeyDown],
  );

  const getCellProps = useCallback(
    (day: CalendarDay) => ({
      role: "gridcell" as const,
      "aria-selected": selectedDates.includes(day.date),
    }),
    [selectedDates],
  );

  const getDayProps = useCallback(
    (day: CalendarDay) => {
      const state = getDayState(day.date);
      return {
        type: "button" as const,
        tabIndex: state.focused ? 0 : -1,
        "aria-label": formatFullDate(day.date),
        /** Not the `disabled` attribute: a disabled day must stay reachable so the grid can be read. */
        "aria-disabled": state.disabled || undefined,
        "aria-current": day.isToday ? ("date" as const) : undefined,
        "data-date": day.date,
        "data-today": day.isToday || undefined,
        "data-outside": day.outside || undefined,
        "data-weekend": day.weekend || undefined,
        "data-selected": state.selected || undefined,
        "data-disabled": state.disabled || undefined,
        "data-focused": state.focused || undefined,
        "data-in-range": state.inRange || undefined,
        "data-in-preview": state.inPreview || undefined,
        "data-range-start": state.rangeStart || undefined,
        "data-range-end": state.rangeEnd || undefined,
        onClick: () => pick(day.date),
        onFocus: () => setFocusedDate(day.date),
        onPointerEnter: () => setHoveredDate(day.date),
      };
    },
    [getDayState, formatFullDate, pick],
  );

  return {
    mode,
    value,
    selectedDates,
    range,
    hasValue,

    open,
    setOpen,

    month,
    setMonth,
    showPreviousMonth,
    showNextMonth,
    setMonthIndex,
    setYear,
    canGoPrevious: !minMonth || month > minMonth,
    canGoNext: !maxMonth || month < maxMonth,
    monthIndex,
    year,
    months,
    years,
    weeks,
    weekdays,
    weekdayNames: fullWeekdays,
    monthCaption,

    activeDate,
    focusDate,
    previewEnd,

    isDateDisabled,
    getDayState,
    formatFullDate,

    pick,
    clear,
    applyPreset,
    goToToday,

    locale,
    weekStartsOn,
    disabled,
    showClear: clearable && hasValue && !disabled,
    rtl,

    ids,
    rootRef,
    triggerRef,

    getRootProps,
    getTriggerProps,
    getPopupProps,
    getGridProps,
    getCellProps,
    getDayProps,
  };
}

