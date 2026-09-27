/**
 * Date picker
 *
 * One date, several dates, or a range — with a full keyboard grid, bounds,
 * blocked dates, presets and right-to-left support. Values are `YYYY-MM-DD`
 * strings, so nothing shifts across a time zone, and every name comes from
 * `Intl`, so there is nothing to translate but the labels.
 *
 * @example
 * ```tsx
 * import { DatePicker } from "slotsmith/date-picker";
 * import "slotsmith/date-picker.css";
 *
 * <DatePicker mode="range" value={stay} onChange={setStay} />;
 * ```
 */

export { DatePicker, DatePickerProvider, DatePickerRoot, splitDatePickerProps } from "./DatePicker";
export type {
  DatePickerProps,
  DatePickerProviderProps,
  DatePickerRootProps,
  DatePickerSelection,
  DatePickerSharedProps,
} from "./DatePicker";

export {
  DatePickerCalendar,
  DatePickerDayView,
  DatePickerFooter,
  DatePickerHeader,
  DatePickerPopup,
  DatePickerTrigger,
  mergeProps as mergeDatePickerProps,
} from "./parts";

export { useDatePicker } from "./core/useDatePicker";
export type { DatePickerDayState, DatePickerModel, UseDatePickerOptions } from "./core/useDatePicker";

export { addDays, addMonths, formatDate, fromISODate, toISODate, today } from "./core/calendar";
export type {
  CalendarDay,
  DatePickerMode,
  DatePickerPreset,
  DatePickerValue,
  DatePickerValueMap,
  DateRange,
  ISODate,
  WeekStart,
} from "./core/types";

export { useDatePickerContext } from "./slots/context";
export type { DatePickerContextValue } from "./slots/context";

export { datePickerFallbacks, defaultDatePickerLabels } from "./slots/fallbacks";
export type * from "./slots/types";
