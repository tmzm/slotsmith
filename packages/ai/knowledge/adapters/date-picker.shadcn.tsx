/**
 * DatePicker for shadcn/ui
 *
 * A `components` map that renders the slotsmith date picker with shadcn/ui
 * primitives, written for shadcn/ui on Tailwind CSS v4. Copy the file, keep
 * the parts you want, and pass the map as `components={shadcnDatePicker}`;
 * every slot left out keeps its fallback.
 *
 * The `@/components/ui/*` and `@/lib/utils` imports are the app's own
 * shadcn/ui files.
 */
import { useMemo, type RefObject } from "react";
import {
  useDatePickerContext,
  type DatePickerComponents,
} from "slotsmith/date-picker";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui date picker parts
 *
 * What the `components` map looks like against shadcn/ui. Element parts are
 * plain Tailwind on the DOM node the component already renders; only the
 * widget parts need a body.
 *
 * The range band is built from stacked `data-*` variants rather than from
 * class order: `[data-in-range][data-range-start]` outranks `[data-in-range]`
 * on specificity, so which corners are round never depends on how Tailwind
 * happens to sort its output.
 */

const Chevron = ({ flip }: { flip?: boolean }) => (
  <svg
    className={cn("size-4", flip && "rotate-180")}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/**
 * The caption's two dropdowns: shadcn's `NativeSelect`, as shadcn's own
 * calendar uses native selects for its month and year. The browser draws the
 * open list itself, and `color-scheme` makes it dark in dark mode.
 */
const captionSelect =
  "h-7 border-transparent py-0 ps-2 pe-7 text-sm font-medium shadow-none scheme-light dark:scheme-dark";
/** The open list takes the popover's colours: on Windows the browser draws it from the options' own. */
const captionOption = "bg-popover text-popover-foreground";

/**
 * Calendar layout
 *
 * The calendar's own structure, which no slot renders: the header row, the
 * seven columns of the weekday and week rows, and the centred cells. Laid
 * out here too, so the picker holds together without slotsmith's stylesheet.
 * Tailwind reads `_` in a selector as a space, so the class names' own
 * underscores are escaped, in `String.raw` so the backslash stays.
 */
const calendarLayout = cn(
  String.raw`[&_.sdp\_\_header]:flex [&_.sdp\_\_header]:items-center [&_.sdp\_\_header]:justify-between [&_.sdp\_\_header]:gap-1 [&_.sdp\_\_header]:pb-2`,
  String.raw`[&_.sdp\_\_weekdays]:grid [&_.sdp\_\_weekdays]:grid-cols-7 [&_.sdp\_\_week]:grid [&_.sdp\_\_week]:grid-cols-7`,
  String.raw`[&_.sdp\_\_columnheader]:grid [&_.sdp\_\_columnheader]:min-w-0 [&_.sdp\_\_columnheader]:place-items-center`,
  String.raw`[&_.sdp\_\_cell]:grid [&_.sdp\_\_cell]:min-w-0 [&_.sdp\_\_cell]:place-items-center`,
);

export const shadcnDatePicker: Partial<DatePickerComponents> = {
  Root: ({ className, ...props }) => (
    <div
      data-slot="date-picker"
      className={cn("relative w-full max-w-72", className)}
      {...props}
    />
  ),

  /**
   * shadcn's `InputGroup`: the field frame, with its border, ring and
   * destructive state. With the text field it holds the `InputGroupInput`
   * and the buttons; as the single button trigger it is the combobox itself,
   * a frame rather than a `Button` because it holds the clear button and a
   * button cannot hold another.
   */
  Trigger: ({ className, ...props }) => (
    <InputGroup
      className={cn(
        "min-h-9 cursor-pointer gap-2 bg-background px-3 text-sm",
        "data-open:border-ring data-open:ring-[3px] data-open:ring-ring/50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        /** The text-field trigger: the field and its buttons sit right against the frame. */
        "data-[trigger=input]:cursor-text data-[trigger=input]:gap-0 data-[trigger=input]:px-0",
        "data-[trigger=input]:data-disabled:cursor-not-allowed data-[trigger=input]:data-disabled:opacity-50",
        "data-invalid:border-destructive data-invalid:ring-destructive/20 dark:data-invalid:ring-destructive/40",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  ),

  Value: ({ text, placeholder, empty }) => (
    <span className={cn("flex-1 truncate", empty && "text-muted-foreground")}>
      {empty ? placeholder : text}
    </span>
  ),

  /** The group's `InputGroupInput`: the frame draws the field around it. */
  Input: ({ className, ...props }) => (
    <InputGroupInput
      className={cn("h-auto min-w-0 px-3", className)}
      {...props}
    />
  ),

  /** An icon `InputGroupButton` around the calendar glyph, in the inline-end addon. */
  Toggle: ({ className, type = "button", ...props }) => (
    <InputGroupAddon
      align="inline-end"
      className="p-0 pe-1.5 has-[>button]:me-0"
    >
      <InputGroupButton
        type={type}
        size="icon-xs"
        className={cn("size-7", className)}
        {...props}
      />
    </InputGroupAddon>
  ),

  Icon: ({ open }) => (
    <svg
      className={cn(
        "size-4 shrink-0 opacity-60 transition-opacity",
        open && "text-primary opacity-100",
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  ),

  /** An icon `InputGroupButton`; the click stops here so it does not reach the trigger. */
  Clear: ({ onClick, ...aria }) => (
    <InputGroupAddon align="inline-end" className="p-0 has-[>button]:me-0">
      <InputGroupButton
        size="icon-xs"
        className="size-6 text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        {...aria}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </InputGroupButton>
    </InputGroupAddon>
  ),

  /**
   * shadcn's `Popover`, anchored to the trigger: it portals the calendar,
   * places and animates it as every shadcn popover does. Focus stays with
   * the picker, which moves it into the grid itself. The content keeps every
   * prop the part is given, its `id` included, which is how the picker knows
   * the portaled calendar is still part of it; the built-in position style is
   * left out.
   */
  Popup: function ShadcnPopup({ className, style: _style, ...props }) {
    const { position } = useDatePickerContext();
    const anchor = useMemo(
      () => ({ current: position.anchor }),
      [position.anchor],
    );
    if (!position.anchor) return null;
    return (
      <Popover open>
        <PopoverAnchor virtualRef={anchor as RefObject<HTMLElement>} />
        <PopoverContent
          align="start"
          side={position.placement === "top-start" ? "top" : "bottom"}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          // Its own stacking context, so the range band behind each day stays above the surface.
          className={cn("isolate w-72 p-2", calendarLayout, className)}
          {...props}
        />
      </Popover>
    );
  },

  Calendar: ({ className, ...props }) => (
    <div className={cn("grid gap-0.5", className)} {...props} />
  ),

  Caption: ({
    monthIndex,
    year,
    months,
    years,
    onMonthChange,
    onYearChange,
    labels,
  }) => (
    <span className="flex items-center gap-1">
      <NativeSelect
        size="sm"
        className={captionSelect}
        aria-label={labels.month}
        value={monthIndex}
        onChange={(event) => onMonthChange(Number(event.target.value))}
      >
        {months.map((name, index) => (
          <NativeSelectOption
            key={name}
            value={index}
            className={captionOption}
          >
            {name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        size="sm"
        className={captionSelect}
        aria-label={labels.year}
        value={year}
        onChange={(event) => onYearChange(Number(event.target.value))}
      >
        {years.map((value) => (
          <NativeSelectOption
            key={value}
            value={value}
            className={captionOption}
          >
            {value}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </span>
  ),

  /** A ghost icon `Button` with the chevron, mirrored for the next month. */
  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="size-7 disabled:opacity-35"
      {...aria}
    >
      <Chevron flip={direction === "next"} />
    </Button>
  ),

  /**
   * One column header. Clipped rather than wrapped: the column is one cell
   * wide, and locales whose short weekday names are full words would
   * otherwise make the row two lines tall.
   */
  Weekday: ({ label }) => (
    <span className="block truncate py-1 text-center text-[0.7rem] font-medium text-muted-foreground">
      {label}
    </span>
  ),

  /**
   * One cell of the grid.
   *
   * A fixed `size-8` square, centred in its column, so the button is exactly
   * as wide as it is tall rather than stretching to the column. Blocked days
   * are dimmed through `data-[disabled]`: they stay focusable, so the
   * `disabled:` variant never applies.
   *
   * The band is a `before:` layer at a negative z-index: it reaches half the
   * gutter past each inline edge so neighbouring days meet across the gap,
   * and it sits behind both the picked chip and the label.
   */
  Day: ({ className, type = "button", ...props }) => (
    <Button
      type={type}
      variant="ghost"
      size="icon"
      className={cn(
        "relative size-8 justify-self-center rounded-md text-[0.8125rem] font-normal",
        "data-disabled:cursor-not-allowed data-disabled:opacity-30",
        "data-outside:text-muted-foreground",
        "data-today:inset-ring-1 data-today:inset-ring-primary/60",
        "data-in-range:before:absolute data-in-range:before:inset-y-0 data-in-range:before:content-['']",
        "data-in-range:before:inset-x-[calc(var(--sdp-gap,0.25rem)/-2-0.5px)]",
        "data-in-range:before:z-[-1] data-in-range:before:bg-primary/15",
        "data-in-preview:bg-primary/10",
        "data-in-range:data-range-start:before:start-[0]",
        "data-in-range:data-range-start:before:rounded-s-md",
        "data-in-range:data-range-end:before:end-[0]",
        "data-in-range:data-range-end:before:rounded-e-md",
        "data-selected:bg-primary data-selected:font-semibold data-selected:text-primary-foreground",
        "data-selected:hover:bg-primary data-selected:hover:text-primary-foreground",
        className,
      )}
      {...props}
    />
  ),

  DayContent: ({ day }) => <span>{day.day}</span>,

  /** Outline `Button` chips for the presets, and a ghost `Button` for today. */
  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreset(preset.value)}
          className="h-6 rounded-full px-2 text-xs font-normal"
        >
          {preset.label}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToday}
        className="ms-auto h-6 rounded-full px-2 text-xs font-normal text-muted-foreground"
      >
        {todayLabel}
      </Button>
    </div>
  ),
};
