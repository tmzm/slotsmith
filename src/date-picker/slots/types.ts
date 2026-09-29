import type { ButtonHTMLAttributes, ComponentType, HTMLAttributes, ReactNode, Ref } from "react";
import type { CalendarDay, DatePickerPreset, DateRange, ISODate } from "../core/types";

/**
 * DOM props
 *
 * The attributes an element part receives.
 *
 * `color` is removed because component libraries reuse that attribute name
 * for their own semantic palette prop: a slot that forwarded the DOM `color`
 * would collide with MUI's `<IconButton color>` or Chakra's style props. The
 * autocomplete and the data table drop the same kind of attribute for the
 * same reason.
 *
 * @typeParam E - The element type.
 */
type DomProps<E extends HTMLElement> = Omit<HTMLAttributes<E>, "color">;

/**
 * Root slot props
 *
 * Element part: the box around the whole control. Carries `data-mode`,
 * `data-open`, `data-disabled` and `data-empty`, and is the element the
 * outside-click check measures against.
 */
export interface DpRootProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Trigger slot props
 *
 * Element part: the control that opens the calendar. It carries
 * `role="combobox"` with `aria-haspopup="dialog"`, and is a `<div>` rather
 * than a `<button>` because the clear control inside it is a button and HTML
 * forbids nesting them.
 */
export interface DpTriggerProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Popup slot props
 *
 * Element part: the floating surface holding the calendar. It carries
 * `role="dialog"` and the position style. Replace it to use a library's own
 * popover, in which case its positioning replaces the built-in one.
 */
export interface DpPopupProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Calendar slot props
 *
 * Element part: the month grid, `role="grid"`. It owns the keyboard path, so
 * it must forward `onKeyDown`.
 */
export interface DpCalendarProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Day slot props
 *
 * Element part: one day cell. Carries `data-date`, `data-today`,
 * `data-outside`, `data-weekend`, `data-selected`, `data-disabled`,
 * `data-focused`, `data-in-range`, `data-in-preview`, `data-range-start` and
 * `data-range-end`, and a roving `tabIndex`.
 *
 * Button attributes rather than the generic ones, because a day is a button.
 * A blocked day gets `aria-disabled` and `data-disabled` but never the
 * `disabled` attribute: the WAI-ARIA pattern keeps it focusable, so the arrow
 * keys can walk across it and a screen reader can announce it.
 */
export interface DpDayProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "type"> {
  type?: "button";
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Value slot props
 *
 * Widget part: the trigger's text.
 */
export interface DpValueProps {
  /** The formatted selection, when there is one. */
  text?: string;
  /** Shown when nothing is picked. */
  placeholder: string;
  /** Whether anything is picked. */
  empty: boolean;
}

/**
 * Icon slot props
 *
 * Widget part: the calendar affordance on the trigger.
 */
export interface DpIconProps {
  /** Whether the calendar is open. */
  open: boolean;
}

/**
 * Clear slot props
 *
 * Widget part: empties the selection. Render a real button, and stop the
 * click from reaching the trigger, or clearing will also open the calendar.
 */
export interface DpClearProps {
  /** Clears it. */
  onClick: () => void;
  /** Accessible name. */
  "aria-label": string;
}

/**
 * Caption slot props
 *
 * Widget part: the month and year above the grid, and the way to change
 * them. Changes are kept inside `minDate` / `maxDate`.
 */
export interface DpCaptionProps {
  /** The month being shown, as the 1st of that month. */
  month: ISODate;
  /** The month's name in the current locale. */
  monthLabel: string;
  /** The month being shown, `0` for January. */
  monthIndex: number;
  /** The year being shown. */
  year: number;
  /** Every month name, January first, for a dropdown. */
  months: string[];
  /** The years that can be picked. */
  years: number[];
  /** Shows a different month of the same year. Takes a month index. */
  onMonthChange: (month: number) => void;
  /** Shows the same month of a different year. */
  onYearChange: (year: number) => void;
  /** Accessible names for the two controls. */
  labels: { month: string; year: string };
}

/**
 * Nav slot props
 *
 * Widget part: a previous or next control.
 */
export interface DpNavProps {
  /**
   * Which way its arrow should point, as if the page were left to right.
   * In right-to-left this is reversed for you: the control that moves back
   * in time sits on the right and points right, so it is told `next`.
   * `aria-label` always says what it does.
   */
  direction: "previous" | "next";
  /** Moves the calendar. */
  onClick: () => void;
  /** Whether the move would leave the allowed range. */
  disabled: boolean;
  /** Accessible name. */
  "aria-label": string;
}

/**
 * Weekday slot props
 *
 * Widget part: one column header. It is wrapped in a `role="columnheader"`
 * element named with the full weekday, so a one-letter label is still read
 * out as a day.
 */
export interface DpWeekdayProps {
  /** The name in the current locale, in the chosen `weekdayFormat`. */
  label: string;
  /** The full name, e.g. "Saturday". */
  name: string;
  /** 0 to 6, in display order. */
  index: number;
}

/**
 * Day content slot props
 *
 * Widget part: what a day cell contains. This is where prices, dots or
 * badges belong: the `Day` part is an element part and only receives DOM
 * props, so the day itself is handed to this part instead.
 */
export interface DpDayContentProps {
  /** The day being rendered. */
  day: CalendarDay;
  /** Whether it is picked. */
  selected: boolean;
  /** Whether it sits inside a picked range. */
  inRange: boolean;
  /** Whether it sits inside the range preview. */
  inPreview: boolean;
  /** Whether it cannot be picked. */
  disabled: boolean;
}

/**
 * Footer slot props
 *
 * Widget part: the row under the grid.
 */
export interface DpFooterProps {
  /** The shortcuts to offer. */
  presets: DatePickerPreset[];
  /** Applies one. */
  onPreset: (value: ISODate | DateRange) => void;
  /** Jumps to today without picking it. */
  onToday: () => void;
  /** The label for that control — navigation, so it should read and look apart from the presets rather than like one of them. */
  todayLabel: string;
}

/**
 * Date picker components
 *
 * Every replaceable part.
 *
 * Element parts — `Root`, `Trigger`, `Popup`, `Calendar`, `Day` — receive DOM
 * props with state as `data-*`, so a library's primitives drop straight in.
 * Widget parts receive semantic props and usually need a short adapter.
 *
 * The header row, the weekday row and the week rows are not parts: they are
 * layout the grid depends on, so they stay structural and every skin
 * inherits the seven-column grid.
 *
 * @example
 * ```tsx
 * const mui: Partial<DatePickerComponents> = {
 *   Popup: (props) => <Paper elevation={8} {...props} />,
 *   Day: (props) => <IconButton size="small" {...props} />,
 * };
 * ```
 */
export interface DatePickerComponents {
  Root: ComponentType<DpRootProps>;
  Trigger: ComponentType<DpTriggerProps>;
  Value: ComponentType<DpValueProps>;
  Icon: ComponentType<DpIconProps>;
  Clear: ComponentType<DpClearProps>;
  Popup: ComponentType<DpPopupProps>;
  Calendar: ComponentType<DpCalendarProps>;
  Caption: ComponentType<DpCaptionProps>;
  Nav: ComponentType<DpNavProps>;
  Weekday: ComponentType<DpWeekdayProps>;
  Day: ComponentType<DpDayProps>;
  DayContent: ComponentType<DpDayContentProps>;
  Footer: ComponentType<DpFooterProps>;
}

/**
 * Date picker slot props
 *
 * Extra DOM props for the element parts, merged with the ones the component
 * sets itself.
 */
export interface DatePickerSlotProps {
  root?: DpRootProps;
  trigger?: DpTriggerProps;
  popup?: DpPopupProps;
  calendar?: DpCalendarProps;
  /** Per-day props, e.g. a class that depends on the date. */
  day?: (day: CalendarDay) => DpDayProps;
}

/**
 * Date picker labels
 *
 * Every user-facing string, so translating is a prop rather than a fork.
 * Month and weekday names are not here: they come from `Intl` in the chosen
 * `locale`.
 */
export interface DatePickerLabels {
  /** Trigger text when nothing is picked, and the trigger's default accessible name. */
  placeholder: string;
  /** Accessible name for the clear control. */
  clear: string;
  /** Accessible name for the previous-month control. */
  previous: string;
  /** Accessible name for the next-month control. */
  next: string;
  /** Label for the control that jumps to today's month without picking it — a navigation verb, not the bare word "today", so it reads apart from the presets. */
  today: string;
  /** Accessible name for the month dropdown. */
  month: string;
  /** Accessible name for the year dropdown. */
  year: string;
  /** Accessible name for the popup. */
  dialog: string;
  /** Multiple mode: how the trigger summarises more than two dates. */
  count: (count: number) => string;
  /** Range mode, when only the start is picked. Receives the formatted start. */
  rangeStart: (from: string) => string;
  /** Range mode, when both ends are picked. Receives both formatted ends. */
  range: (from: string, to: string) => string;
}

/**
 * Children
 *
 * Re-exported so slot authors do not need a separate React import.
 */
export type { ReactNode };
