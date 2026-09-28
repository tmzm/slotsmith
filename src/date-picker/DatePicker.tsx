"use client";

import { useMemo, type HTMLAttributes, type ReactNode } from "react";
import { useLocaleSection } from "../locale/useLocaleSection";
import type { LocaleInput } from "../locale/types";
import { mergeProps } from "../shared/mergeProps";
import { usePopupPosition, type PopupPlacement } from "../shared/position";
import { formatDate } from "./core/calendar";
import type { DatePickerMode, DatePickerPreset, DateRange, ISODate } from "./core/types";
import { useDatePicker, type UseDatePickerOptions } from "./core/useDatePicker";
import {
  DatePickerCalendar,
  DatePickerDayView,
  DatePickerFooter,
  DatePickerHeader,
  DatePickerPopup,
  DatePickerTrigger,
} from "./parts";
import { DatePickerContext, useDatePickerContext, type DatePickerContextValue } from "./slots/context";
import { datePickerFallbacks, defaultDatePickerLabels } from "./slots/fallbacks";
import type { DatePickerComponents, DatePickerLabels, DatePickerSlotProps } from "./slots/types";

/**
 * Shared date picker props
 *
 * Everything that means the same thing in every mode.
 */
export interface DatePickerSharedProps
  extends Omit<UseDatePickerOptions, "mode" | "value" | "defaultValue" | "onChange" | "locale"> {
  /**
   * The language: a locale object, or a BCP 47 tag. A tag formats dates and
   * names with `Intl` as always, and takes its labels from the pack of that
   * language given to `SlotsmithProvider`, if there is one. Defaults to the
   * provider's, then `en-US`.
   */
  locale?: LocaleInput;
  /** Trigger text when nothing is picked. Defaults to `labels.placeholder`. */
  placeholder?: string;
  /** Shortcuts shown under the grid. A date preset in range mode picks that one day. */
  presets?: DatePickerPreset[];
  /** How the trigger formats a date. Defaults to `{ day: "numeric", month: "short", year: "numeric" }`. */
  format?: Intl.DateTimeFormatOptions;
  /** Replace any part; the rest stay as fallbacks. */
  components?: Partial<DatePickerComponents>;
  /** Override any string. Wins over `locale`. */
  labels?: Partial<DatePickerLabels>;
  /** Extra DOM props for the element parts. */
  slotProps?: DatePickerSlotProps;
  /** Which side of the trigger the popup prefers. Defaults to `bottom`. */
  placement?: PopupPlacement;
  /** Gap between trigger and popup, in pixels. Defaults to 4. */
  popupOffset?: number;
}

/**
 * Single-mode props
 */
interface SingleSelection {
  /** One date. The default mode. */
  mode?: "single";
  /** The picked date, or `null` for nothing. */
  value?: ISODate | null;
  /** The picked date while uncontrolled. */
  defaultValue?: ISODate | null;
  /** The new date, or `null` when cleared. */
  onChange?: (value: ISODate | null) => void;
}

/**
 * Multiple-mode props
 */
interface MultipleSelection {
  /** Any number of dates, toggled one click at a time. */
  mode: "multiple";
  /** The picked dates. */
  value?: ISODate[];
  /** The picked dates while uncontrolled. */
  defaultValue?: ISODate[];
  /** The new dates, sorted, always an array. */
  onChange?: (value: ISODate[]) => void;
}

/**
 * Range-mode props
 */
interface RangeSelection {
  /** A start and an end: the first click sets the start, the second the end. */
  mode: "range";
  /** The picked range. Either end may be missing while picking. */
  value?: DateRange | null;
  /** The picked range while uncontrolled. */
  defaultValue?: DateRange | null;
  /** The new range, or `null` when cleared. */
  onChange?: (value: DateRange | null) => void;
}

/**
 * Date picker selection
 *
 * A discriminated union on `mode`, so `value`, `defaultValue` and `onChange`
 * cannot be given the wrong shape. `mode` may be left out only for a single
 * date.
 */
export type DatePickerSelection = SingleSelection | MultipleSelection | RangeSelection;

/**
 * Date picker provider props
 *
 * The shared props, one mode's selection props, and your layout.
 */
export type DatePickerProviderProps = DatePickerSharedProps &
  DatePickerSelection & {
    /** Your layout, built from the compound parts. */
    children?: ReactNode;
  };

/**
 * Loose props
 *
 * The union flattened for the implementation. This is the one cast the
 * component keeps; the engine works on the loose shape.
 */
type LooseProps = DatePickerSharedProps & {
  mode?: DatePickerMode;
  value?: ISODate | ISODate[] | DateRange | null;
  defaultValue?: ISODate | ISODate[] | DateRange | null;
  onChange?: (value: never) => void;
  children?: ReactNode;
};

/**
 * Without undefined
 *
 * Drops `undefined` entries, so `{ Day: undefined }` keeps the fallback
 * instead of erasing it.
 *
 * @typeParam O - The object type.
 * @param object - The overrides, or nothing.
 * @returns The defined entries.
 */
const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;

/** The trigger's default format: "Mar 12, 2026" in English. */
const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/**
 * Describe value
 *
 * What the trigger reads for the current value.
 *
 * @param mode - The mode.
 * @param value - The value in that mode's shape.
 * @param locale - A BCP 47 tag.
 * @param format - How to format each date.
 * @param labels - The resolved labels.
 * @returns The text, or `undefined` when nothing is picked.
 */
function describeValue(
  mode: DatePickerMode,
  value: unknown,
  locale: string,
  format: Intl.DateTimeFormatOptions,
  labels: DatePickerLabels,
): string | undefined {
  const show = (date?: ISODate | null) => formatDate(date, locale, format);

  if (mode === "multiple") {
    const list = Array.isArray(value) ? [...(value as ISODate[])].sort() : [];
    if (!list.length) return undefined;
    /** Two fit on a trigger; more would overflow, so say how many instead. */
    return list.length <= 2 ? list.map(show).join(", ") : labels.count(list.length);
  }

  if (mode === "range") {
    const range = (value as DateRange | null) ?? {};
    if (!range.from) return undefined;
    /** A half-picked range still says something, rather than falling back to the placeholder. */
    return range.to ? labels.range(show(range.from), show(range.to)) : labels.rangeStart(show(range.from));
  }

  return typeof value === "string" && value ? show(value) : undefined;
}

/**
 * DatePicker.Provider
 *
 * Runs the engine and shares it with the compound parts and
 * `useDatePickerContext()`. Renders no markup of its own, so the layout is
 * entirely yours.
 *
 * @param props - See {@link DatePickerProviderProps}.
 *
 * @example
 * ```tsx
 * <DatePicker.Provider mode="range" value={stay} onChange={setStay}>
 *   <DatePicker.Root>
 *     <DatePicker.Trigger aria-label="Stay" />
 *     <DatePicker.Popup />
 *   </DatePicker.Root>
 * </DatePicker.Provider>
 * ```
 */
export function DatePickerProvider(props: DatePickerProviderProps) {
  const {
    components,
    labels: labelOverrides,
    locale,
    slotProps,
    placeholder,
    presets,
    format = DEFAULT_FORMAT,
    placement,
    popupOffset,
    children,
    ...engineOptions
  } = props as LooseProps;

  const { code, labels: localeLabels } = useLocaleSection("datePicker", locale);
  /** English, then the locale, then the caller's own overrides. */
  const labels = useMemo(
    () => ({
      ...defaultDatePickerLabels,
      ...withoutUndefined(localeLabels),
      ...withoutUndefined(labelOverrides),
    }),
    [localeLabels, labelOverrides],
  );
  const parts = useMemo(
    () => ({ ...datePickerFallbacks, ...withoutUndefined(components) }) as DatePickerComponents,
    [components],
  );

  /** The headless hook takes a tag, never a pack. */
  const model = useDatePicker({ ...engineOptions, locale: code ?? "en-US" } as UseDatePickerOptions);

  /**
   * The calendar has a width of its own, so it only has to be at least as
   * wide as the trigger. Its height is fixed by the six-week grid, so the
   * only cap is the room the viewport actually has.
   */
  const position = usePopupPosition({
    open: model.open,
    placement,
    offset: popupOffset,
    matchTriggerWidth: false,
    maxHeight: Number.POSITIVE_INFINITY,
  });

  const contextValue: DatePickerContextValue = {
    ...model,
    components: parts,
    labels,
    slotProps: slotProps ?? {},
    position,
    placeholder: placeholder ?? labels.placeholder,
    presets: presets ?? [],
    text: describeValue(model.mode, model.value, model.locale, format, labels),
  };

  return <DatePickerContext.Provider value={contextValue}>{children}</DatePickerContext.Provider>;
}

/**
 * Root props
 *
 * Plain `<div>` props for the element around the whole control.
 */
export interface DatePickerRootProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {}

/**
 * DatePicker.Root
 *
 * The `Root` part, carrying `data-mode`, `data-open`, `data-disabled` and
 * `data-empty`, and the element the outside-click check measures against.
 *
 * @param props - See {@link DatePickerRootProps}.
 */
export function DatePickerRoot(props: DatePickerRootProps) {
  const { components: C, slotProps, getRootProps } = useDatePickerContext();

  return <C.Root {...mergeProps(mergeProps(getRootProps(), slotProps.root), props)} />;
}

/**
 * Date picker props
 *
 * The provider props plus the root's `<div>` props. Still a union on `mode`,
 * so the value's shape narrows at the call site.
 */
export type DatePickerProps = DatePickerSharedProps &
  DatePickerSelection &
  Omit<DatePickerRootProps, "children" | "defaultValue" | "onChange" | "onBlur">;

/**
 * Provider keys
 *
 * The props that belong to the provider; anything else lands on the root.
 */
const PROVIDER_KEYS = [
  "mode", "value", "defaultValue", "onChange",
  "open", "defaultOpen", "onOpenChange",
  "locale", "weekStartsOn", "weekdayFormat", "minDate", "maxDate", "disabledDates",
  "clearable", "disabled", "closeOnSelect", "onBlur",
  "placeholder", "presets", "format", "components", "labels", "slotProps", "placement", "popupOffset",
] as const;

/**
 * Missing provider keys
 *
 * Compile-time guard: adding a provider option without listing it above fails
 * to type-check.
 */
type MissingProviderKeys = Exclude<
  keyof DatePickerSharedProps | keyof DatePickerSelection,
  (typeof PROVIDER_KEYS)[number]
>;
const _allProviderKeysListed: [MissingProviderKeys] extends [never] ? true : MissingProviderKeys = true;
void _allProviderKeysListed;

const providerKeys = new Set<string>(PROVIDER_KEYS);

/**
 * Split date picker props
 *
 * Separates `<DatePicker>` props into provider options and root DOM props.
 * Useful when wrapping the component in one of your own on the same props.
 *
 * @typeParam P - The full props type.
 * @param props - The component's props.
 * @returns `providerProps` for `DatePicker.Provider`, `rest` for your layout.
 *
 * @example
 * ```tsx
 * function DueDate(props: DatePickerProps & { hint?: string }) {
 *   const { providerProps, rest } = splitDatePickerProps(props);
 *   const { hint, ...rootProps } = rest;
 *   return (
 *     <DatePicker.Provider {...providerProps}>
 *       <DatePicker.Root {...rootProps}>
 *         <DatePicker.Trigger />
 *         <DatePicker.Popup />
 *       </DatePicker.Root>
 *       {hint ? <p>{hint}</p> : null}
 *     </DatePicker.Provider>
 *   );
 * }
 * ```
 */
export function splitDatePickerProps<P extends DatePickerProps>(props: P) {
  const providerProps: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (providerKeys.has(key) ? providerProps : rest)[key] = value;
  }
  return {
    providerProps: providerProps as unknown as DatePickerProviderProps,
    rest: rest as Omit<P, keyof DatePickerSharedProps | keyof DatePickerSelection>,
  };
}

/**
 * Trigger prop keys
 *
 * Attributes that name or validate the control. They belong on the element
 * carrying `role="combobox"`, not on the wrapper, because that element is
 * what assistive technology announces.
 */
const TRIGGER_PROP_KEYS = new Set([
  "id",
  "title",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-invalid",
  "aria-required",
]);

/**
 * Date picker component
 *
 * The default layout: root, trigger and popup.
 *
 * @param props - See {@link DatePickerProps}.
 */
function DatePickerComponent(props: DatePickerProps) {
  const { providerProps, rest } = splitDatePickerProps(props);
  const triggerProps: Record<string, unknown> = {};
  const rootProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    (TRIGGER_PROP_KEYS.has(key) ? triggerProps : rootProps)[key] = value;
  }

  return (
    <DatePickerProvider {...providerProps}>
      <DatePickerRoot {...(rootProps as DatePickerRootProps)}>
        <DatePickerTrigger {...triggerProps} />
        <DatePickerPopup />
      </DatePickerRoot>
    </DatePickerProvider>
  );
}

/**
 * DatePicker
 *
 * One component for a single date, several dates, or a range. Values are
 * `YYYY-MM-DD` strings throughout, so nothing shifts across a time zone, and
 * month and weekday names come from `Intl` in whatever `locale` you pass.
 *
 * The grid follows the WAI-ARIA date picker pattern: arrows, Home / End and
 * Page Up / Page Down move a roving focus, blocked days stay reachable but
 * cannot be picked, and in right-to-left the arrows follow the mirrored
 * layout.
 *
 * Every part is replaceable through `components`, every string through
 * `labels`, and the fallbacks are plain accessible HTML. The compound parts
 * (`DatePicker.Provider`, `.Root`, `.Trigger`, `.Popup`, `.Header`,
 * `.Calendar`, `.Day`, `.Footer`) are there when the default layout is not
 * enough.
 *
 * @param props - See {@link DatePickerProps}.
 *
 * @example
 * ```tsx
 * // One date.
 * <DatePicker value={due} onChange={setDue} />
 *
 * // A stay, from the first night to the last, weekdays only.
 * <DatePicker mode="range" value={stay} onChange={setStay} minDate={today()} disabledDates={isWeekend} />
 *
 * // Several dates, in Arabic, with the week starting on Saturday.
 * <DatePicker mode="multiple" value={days} onChange={setDays} locale="ar-EG" weekStartsOn={6} />
 * ```
 */
export const DatePicker = /* @__PURE__ */ Object.assign(DatePickerComponent, {
  Provider: DatePickerProvider,
  Root: DatePickerRoot,
  Trigger: DatePickerTrigger,
  Popup: DatePickerPopup,
  Header: DatePickerHeader,
  Calendar: DatePickerCalendar,
  Day: DatePickerDayView,
  Footer: DatePickerFooter,
});
