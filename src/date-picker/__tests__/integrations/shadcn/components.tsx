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
import type { DatePickerComponents } from "../../../index";
import { cn } from "./ui/utils";

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

/** The caption's two dropdowns share everything but their options. */
const selectClass = cn(
  "cursor-pointer rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium",
  "text-foreground outline-none hover:border-input focus-visible:ring-2 focus-visible:ring-ring",
);

export const shadcnDatePicker: Partial<DatePickerComponents> = {
  Root: ({ className, ...props }) => (
    <div data-slot="date-picker" className={cn("relative w-full max-w-72", className)} {...props} />
  ),

  Trigger: ({ className, ...props }) => (
    <div
      className={cn(
        "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5",
        "bg-background text-sm transition-colors outline-none hover:border-ring/60",
        "data-[open]:border-ring data-[open]:ring-3 data-[open]:ring-ring/25",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        /** shadcn's own invalid treatment: the destructive border, and the destructive ring while open or focused. */
        "aria-invalid:border-destructive aria-invalid:hover:border-destructive",
        "aria-invalid:data-[open]:border-destructive aria-invalid:data-[open]:ring-destructive/20 dark:aria-invalid:data-[open]:ring-destructive/40",
        "aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20 dark:aria-invalid:focus-visible:ring-destructive/40",
        className,
      )}
      {...props}
    />
  ),

  Value: ({ text, placeholder, empty }) => (
    <span className={cn("flex-1 truncate", empty && "text-muted-foreground")}>{empty ? placeholder : text}</span>
  ),

  Icon: ({ open }) => (
    <svg
      className={cn("size-4 shrink-0 opacity-60 transition-opacity", open && "text-primary opacity-100")}
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

  Clear: ({ onClick, ...aria }) => (
    <button
      type="button"
      className={cn(
        "rounded-sm border-0 bg-transparent p-0.5 text-foreground opacity-50 outline-none",
        "hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  ),

  /** Placement comes from the component's positioner as an inline style; this is only the surface. */
  Popup: ({ className, ...props }) => (
    <div
      data-slot="popover-content"
      className={cn("z-50 w-72 rounded-md border border-border bg-background p-2 shadow-lg", className)}
      {...props}
    />
  ),

  Calendar: ({ className, ...props }) => <div className={cn("grid gap-0.5", className)} {...props} />,

  Caption: ({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) => (
    <span className="flex items-center gap-1">
      <select
        className={selectClass}
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
        className={selectClass}
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
  ),

  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent outline-none",
        "cursor-pointer text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-35",
      )}
      {...aria}
    >
      <Chevron flip={direction === "next"} />
    </button>
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
  Day: ({ className, ...props }) => (
    <button
      type="button"
      className={cn(
        "relative flex size-8 items-center justify-center justify-self-center rounded-md border-0",
        "cursor-pointer bg-transparent text-[0.8125rem] text-foreground outline-none transition-colors",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-30",
        "data-[outside]:text-muted-foreground",
        "data-[today]:inset-ring-1 data-[today]:inset-ring-primary/60",
        "data-[in-range]:before:absolute data-[in-range]:before:inset-y-0 data-[in-range]:before:content-['']",
        "data-[in-range]:before:[inset-inline:calc(var(--sdp-gap,0.25rem)/-2_-_0.5px)]",
        "data-[in-range]:before:[z-index:-1] data-[in-range]:before:bg-primary/15",
        "data-[in-preview]:bg-primary/10",
        "data-[in-range]:data-[range-start]:before:[inset-inline-start:0]",
        "data-[in-range]:data-[range-start]:before:rounded-s-md",
        "data-[in-range]:data-[range-end]:before:[inset-inline-end:0]",
        "data-[in-range]:data-[range-end]:before:rounded-e-md",
        "data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-primary-foreground",
        "data-[selected]:hover:bg-primary",
        className,
      )}
      {...props}
    />
  ),

  DayContent: ({ day }) => <span>{day.day}</span>,

  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onPreset(preset.value)}
          className={cn(
            "cursor-pointer rounded-full border border-border bg-transparent px-2 py-0.5 text-xs text-foreground",
            "hover:border-ring hover:text-ring",
          )}
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onToday}
        className={cn(
          "ms-auto cursor-pointer rounded-full border-0 bg-transparent px-2 py-0.5 text-xs",
          "text-muted-foreground hover:text-foreground",
        )}
      >
        {todayLabel}
      </button>
    </div>
  ),
};
