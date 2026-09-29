import { useId } from "react";
import type { DatePickerComponents, DatePickerLabels } from "./types";
import { classes } from "../classes";

/**
 * Class names
 *
 * Joins the fallback's own class with whatever a caller passed, dropping
 * empties.
 *
 * @param values - Class names, or nothing.
 * @returns The joined class string, or `undefined`.
 */
const cx = (...values: (string | false | null | undefined)[]): string | undefined =>
  values.filter(Boolean).join(" ") || undefined;

/**
 * Chevron icon
 *
 * The month navigation arrow. It points back in time as drawn, and is turned
 * round for the `next` direction.
 */
const ChevronIcon = ({ flip }: { flip?: boolean }) => (
  <svg
    className={classes.chevron}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={flip ? { transform: "rotate(180deg)" } : undefined}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/**
 * Calendar icon
 *
 * The trigger's affordance.
 */
const CalendarIcon = () => (
  <svg className={classes.icon} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 11h18" />
  </svg>
);

/**
 * Cross icon
 *
 * The clear control's glyph.
 */
const CrossIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Today icon
 *
 * The today control's leading glyph: an arrow dropping onto a baseline, read
 * as "jump here" rather than as a shortcut chip, so the control beside it
 * reads as navigation rather than a preset.
 */
const TodayIcon = () => (
  <svg className={classes.todayIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v10" />
    <path d="m7 9 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

/**
 * Date picker fallbacks
 *
 * The built-in parts: plain, accessible HTML that is already finished, so the
 * component works without passing anything. Every one of them is replaceable
 * through `components`.
 *
 * @example
 * ```tsx
 * // Start from the fallbacks and change only what a day shows.
 * const components = { ...datePickerFallbacks, DayContent: DayWithPrice };
 * ```
 */
export const datePickerFallbacks: DatePickerComponents = {
  Root: ({ className, ...props }) => <div className={cx(classes.root, className)} {...props} />,

  Trigger: ({ className, ...props }) => <div className={cx(classes.trigger, className)} {...props} />,

  Value: ({ text, placeholder, empty }) => (
    <span className={cx(classes.value, empty && classes.valueEmpty)}>{empty ? placeholder : text}</span>
  ),

  Icon: () => <CalendarIcon />,

  Clear: ({ onClick, ...aria }) => (
    <button
      type="button"
      className={classes.clear}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <CrossIcon />
    </button>
  ),

  Popup: ({ className, ...props }) => <div className={cx(classes.popup, className)} {...props} />,

  Calendar: ({ className, ...props }) => <div className={cx(classes.calendar, className)} {...props} />,

  Caption: function Caption({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) {
    // An id rather than a name keeps the selects out of an enclosing form's submission.
    const id = useId();
    return (
      <span className={classes.caption}>
        <select
          id={`${id}-month`}
          className={classes.select}
          aria-label={labels.month}
          value={monthIndex}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        >
          {months.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          id={`${id}-year`}
          className={classes.select}
          aria-label={labels.year}
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
        >
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </span>
    );
  },

  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <button type="button" className={classes.nav} onClick={onClick} disabled={disabled} {...aria}>
      <ChevronIcon flip={direction === "next"} />
    </button>
  ),

  Weekday: ({ label }) => <span className={classes.weekday}>{label}</span>,

  Day: ({ className, ...props }) => <button type="button" className={cx(classes.day, className)} {...props} />,

  DayContent: ({ day }) => <span>{day.day}</span>,

  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <div className={classes.footer}>
      {presets.map((preset) => (
        <button key={preset.label} type="button" className={classes.preset} onClick={() => onPreset(preset.value)}>
          {preset.label}
        </button>
      ))}
      <button type="button" className={cx(classes.preset, classes.presetToday, classes.today)} onClick={onToday}>
        <TodayIcon />
        {todayLabel}
      </button>
    </div>
  ),
};

/**
 * Default date picker labels
 *
 * The English strings the fallbacks render. Override any of them through
 * `labels`; the rest keep these values.
 *
 * @example
 * ```tsx
 * <DatePicker locale="ar-EG" labels={{ placeholder: "اختر تاريخًا", today: "اليوم" }} />
 * ```
 */
export const defaultDatePickerLabels: DatePickerLabels = {
  placeholder: "Pick a date",
  clear: "Clear date",
  previous: "Previous month",
  next: "Next month",
  today: "Go to today",
  month: "Month",
  year: "Year",
  dialog: "Choose a date",
  count: (count) => `${count} dates selected`,
  rangeStart: (from) => `${from} — …`,
  range: (from, to) => `${from} — ${to}`,
};
