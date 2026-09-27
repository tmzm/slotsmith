"use client";

import { createContext, useContext } from "react";
import type { PopupPosition } from "../../shared/position";
import type { DatePickerPreset, DatePickerMode } from "../core/types";
import type { DatePickerModel } from "../core/useDatePicker";
import type { DatePickerComponents, DatePickerLabels, DatePickerSlotProps } from "./types";

/**
 * Date picker context value
 *
 * What `<DatePicker>` and `<DatePicker.Provider>` share with the compound
 * parts and with custom slots: the {@link DatePickerModel} plus the resolved
 * parts, labels, slot props and trigger text.
 *
 * @typeParam M - The mode.
 */
export interface DatePickerContextValue<M extends DatePickerMode = DatePickerMode> extends DatePickerModel<M> {
  /** Every part, with the fallbacks filled in. */
  components: DatePickerComponents;
  /** Every label, with the defaults filled in. */
  labels: DatePickerLabels;
  /** The `slotProps` option, or `{}`. */
  slotProps: DatePickerSlotProps;
  /** Where the popup sits, and the refs that keep it there. */
  position: PopupPosition;
  /** The placeholder the trigger shows when nothing is picked. */
  placeholder: string;
  /** The shortcuts offered under the grid. */
  presets: DatePickerPreset[];
  /** What the trigger reads, or `undefined` when nothing is picked. */
  text?: string;
}

/**
 * Date picker context
 *
 * The React context behind {@link useDatePickerContext}.
 */
export const DatePickerContext = createContext<DatePickerContextValue | null>(null);

/**
 * useDatePickerContext
 *
 * Reads the surrounding date picker: its value, shown month, grid, parts and
 * labels. Use it in custom layouts and in parts that need more than the
 * props their slot receives.
 *
 * @typeParam M - The mode, when the caller knows it.
 * @returns See {@link DatePickerContextValue}.
 * @throws When called outside `<DatePicker>` or `<DatePicker.Provider>`.
 *
 * @example
 * ```tsx
 * function StartAgain() {
 *   const { range, clear } = useDatePickerContext<"range">();
 *   if (!range.from) return null;
 *   return <button onClick={clear}>Start again</button>;
 * }
 * ```
 */
export function useDatePickerContext<M extends DatePickerMode = DatePickerMode>(): DatePickerContextValue<M> {
  const value = useContext(DatePickerContext);
  if (!value) {
    throw new Error("useDatePickerContext must be used inside <DatePicker> or <DatePicker.Provider>");
  }
  return value as unknown as DatePickerContextValue<M>;
}
