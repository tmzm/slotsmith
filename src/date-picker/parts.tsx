"use client";

import { mergeProps, mergeRefs } from "../shared/mergeProps";
import type { CalendarDay } from "./core/types";
import { useDatePickerContext } from "./slots/context";
import { classes } from "./classes";

export { mergeProps };

/**
 * Naming keys
 *
 * The attributes that give the combobox its accessible name. When a caller
 * passes none of them, the placeholder names it, so the control is never
 * announced as an unnamed field.
 */
const NAMING_KEYS = ["aria-label", "aria-labelledby"] as const;

/**
 * DatePicker.Trigger
 *
 * The `Trigger` part with what it contains: the calendar icon, the formatted
 * value or the placeholder, and the clear control. Carries `role="combobox"`
 * and `aria-haspopup="dialog"`.
 *
 * @param props - Extra DOM props for the trigger, such as `aria-labelledby`.
 *
 * @example
 * ```tsx
 * <DatePicker.Provider value={date} onChange={setDate}>
 *   <DatePicker.Root>
 *     <label id="due-label">Due</label>
 *     <DatePicker.Trigger aria-labelledby="due-label" />
 *     <DatePicker.Popup />
 *   </DatePicker.Root>
 * </DatePicker.Provider>
 * ```
 */
export function DatePickerTrigger(props: Record<string, unknown> = {}) {
  const {
    components: C,
    labels,
    slotProps,
    position,
    open,
    hasValue,
    showClear,
    clear,
    placeholder,
    text,
    triggerRef,
    getTriggerProps,
  } = useDatePickerContext();

  const named = NAMING_KEYS.some((key) => props[key] !== undefined || slotProps.trigger?.[key] !== undefined);

  return (
    <C.Trigger
      {...mergeProps(
        mergeProps({ ...getTriggerProps(), "aria-label": named ? undefined : placeholder }, slotProps.trigger),
        { ...props, ref: mergeRefs(triggerRef, position.setTrigger) },
      )}
    >
      <C.Icon open={open} />
      <C.Value text={text} placeholder={placeholder} empty={!hasValue} />
      {showClear ? <C.Clear aria-label={labels.clear} onClick={clear} /> : null}
    </C.Trigger>
  );
}

/**
 * DatePicker.Header
 *
 * The row above the grid: the previous control, the caption and the next
 * control. Not a replaceable part itself — it is layout — but everything in
 * it is.
 *
 * In right-to-left the row mirrors, so the control that moves back in time
 * ends up on the right. Its `direction` is swapped to match, which is how a
 * part knows to point its arrow right.
 */
export function DatePickerHeader() {
  const {
    components: C,
    labels,
    rtl,
    month,
    months,
    monthIndex,
    year,
    years,
    canGoPrevious,
    canGoNext,
    showPreviousMonth,
    showNextMonth,
    setMonthIndex,
    setYear,
  } = useDatePickerContext();

  return (
    <div className={classes.header}>
      <C.Nav
        direction={rtl ? "next" : "previous"}
        aria-label={labels.previous}
        disabled={!canGoPrevious}
        onClick={showPreviousMonth}
      />
      <C.Caption
        month={month}
        monthLabel={months[monthIndex]!}
        monthIndex={monthIndex}
        year={year}
        months={months}
        years={years}
        onMonthChange={setMonthIndex}
        onYearChange={setYear}
        labels={{ month: labels.month, year: labels.year }}
      />
      <C.Nav
        direction={rtl ? "previous" : "next"}
        aria-label={labels.next}
        disabled={!canGoNext}
        onClick={showNextMonth}
      />
    </div>
  );
}

/**
 * DatePicker.Day
 *
 * One day of the grid: the `role="gridcell"` wrapper, the `Day` part and its
 * content. Custom grids render it once per date.
 *
 * @param props - The day to render.
 */
export function DatePickerDayView({ day }: { day: CalendarDay }) {
  const { components: C, slotProps, getCellProps, getDayProps, getDayState } = useDatePickerContext();
  const state = getDayState(day.date);

  return (
    <div className={classes.cell} {...getCellProps(day)}>
      <C.Day {...mergeProps(getDayProps(day), slotProps.day?.(day))}>
        <C.DayContent
          day={day}
          selected={state.selected}
          inRange={state.inRange}
          inPreview={state.inPreview}
          disabled={state.disabled}
        />
      </C.Day>
    </div>
  );
}

/**
 * DatePicker.Calendar
 *
 * The `role="grid"` month: a row of weekday headers and six weeks of days.
 * It owns the keyboard path, so focus moves inside it with the arrow keys
 * and only one day is ever in the tab order.
 *
 * @param props - Extra DOM props for the grid element.
 */
export function DatePickerCalendar(props: Record<string, unknown> = {}) {
  const { components: C, slotProps, weeks, weekdays, weekdayNames, getGridProps } = useDatePickerContext();

  return (
    <C.Calendar {...mergeProps(mergeProps(getGridProps(), slotProps.calendar), props)}>
      <div className={classes.weekdays} role="row">
        {weekdays.map((label, index) => (
          <div key={index} className={classes.columnheader} role="columnheader" aria-label={weekdayNames[index]}>
            <C.Weekday label={label} name={weekdayNames[index]!} index={index} />
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <div className={classes.week} role="row" key={week[0]!.date}>
          {week.map((day) => (
            <DatePickerDayView key={day.date} day={day} />
          ))}
        </div>
      ))}
    </C.Calendar>
  );
}

/**
 * DatePicker.Footer
 *
 * The `Footer` part: the presets and the control that shows today's month.
 */
export function DatePickerFooter() {
  const { components: C, labels, presets, applyPreset, goToToday } = useDatePickerContext();

  return <C.Footer presets={presets} onPreset={applyPreset} onToday={goToToday} todayLabel={labels.today} />;
}

/**
 * DatePicker.Popup
 *
 * The floating surface, `role="dialog"`: header, grid and footer, positioned
 * against the trigger. Renders nothing while closed.
 *
 * @param props - Extra DOM props for the popup element.
 */
export function DatePickerPopup(props: Record<string, unknown> = {}) {
  const { components: C, labels, slotProps, open, position, getPopupProps } = useDatePickerContext();
  if (!open) return null;

  return (
    <C.Popup
      {...mergeProps(
        mergeProps(
          {
            ...getPopupProps(),
            "aria-label": labels.dialog,
            style: position.style,
            "data-placement": position.placement,
          },
          slotProps.popup,
        ),
        { ...props, ref: position.setPopup },
      )}
    >
      <DatePickerHeader />
      <DatePickerCalendar />
      <DatePickerFooter />
    </C.Popup>
  );
}
