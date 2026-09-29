import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { Button, Flex, IconButton, Text } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import type { DatePickerComponents } from "../../../index";

/**
 * Radix Themes date picker parts
 *
 * Built from Radix Themes v3 — `Button`, `IconButton`, `Flex`, `Text` and
 * Radix icons — not from its `Popover`, which would position the calendar a
 * second time. The surfaces take the look of Radix's fields and menus from
 * its variables (`--accent-*`, `--gray-*`, `--color-panel-solid`), so they
 * follow the app's `<Theme accentColor appearance>`; their state arrives as
 * `data-*` props, so each part reads its own. The app must import
 * `@radix-ui/themes/styles.css`, as every Radix Themes app already does.
 *
 * The element parts `Omit` `color` from their DOM props because Radix's
 * `color` prop is an accent colour, which a forwarded DOM `color` would
 * collide with.
 */

/** The day cell, in pixels. Matches `--sdp-cell`, so the square fills its column. */
const DAY_SIZE = 32;

/**
 * Has flag
 *
 * @param props - A part's props.
 * @param name - A `data-*` attribute.
 * @returns Whether the engine set it.
 */
const has = (props: object, name: `data-${string}`) => (props as Record<string, unknown>)[name] !== undefined;

/**
 * Caption select style
 *
 * The month and year dropdowns share their whole look: bare text in the
 * medium weight, like a ghost button.
 *
 * They are native selects, not Radix's `Select`: its menu is portalled out
 * of the picker, so choosing a month would count as an outside click and
 * close the calendar.
 */
const captionStyle: CSSProperties = {
  padding: "0 var(--space-1)",
  font: "inherit",
  fontWeight: "var(--font-weight-medium)",
  color: "var(--gray-12)",
  background: "transparent",
  border: 0,
  borderRadius: "var(--radius-2)",
  cursor: "pointer",
};

export const radixComponents: Partial<DatePickerComponents> = {
  Root: ({ style, ...props }) => <div style={{ position: "relative", width: "100%", maxWidth: 288, ...style }} {...props} />,

  /** The surface field of Radix's `TextField`, with its focus outline while open. */
  Trigger: function RadixTrigger({ style, ...props }) {
    const open = has(props, "data-open");
    const disabled = has(props, "data-disabled");
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          width: "100%",
          minHeight: "var(--space-6)",
          paddingInline: "var(--space-2)",
          color: disabled ? "var(--gray-a11)" : "var(--gray-12)",
          fontFamily: "var(--default-font-family)",
          fontSize: "var(--font-size-2)",
          textAlign: "start",
          background: disabled ? "var(--gray-a2)" : "var(--color-surface)",
          boxShadow: "inset 0 0 0 1px var(--gray-a7)",
          borderRadius: "var(--radius-2)",
          outline: open ? "2px solid var(--focus-8)" : 0,
          outlineOffset: -1,
          cursor: disabled ? "not-allowed" : "pointer",
          ...style,
        }}
        {...props}
      />
    );
  },

  Value: ({ text, placeholder, empty }) => (
    <Text size="2" truncate style={{ flex: 1, minWidth: 0, color: empty ? "var(--gray-a10)" : undefined }}>
      {empty ? placeholder : text}
    </Text>
  ),

  Icon: ({ open }) => (
    <span aria-hidden="true" style={{ display: "inline-flex", color: open ? "var(--accent-11)" : "var(--gray-a11)" }}>
      <CalendarIcon />
    </span>
  ),

  Clear: ({ onClick, ...aria }) => (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <CrossCircledIcon />
    </IconButton>
  ),

  /** Placement comes from the component's positioner as an inline style; this is only the surface. */
  Popup: ({ style, ...props }) => (
    <div
      style={{
        zIndex: 50,
        width: 288,
        padding: "var(--space-3)",
        color: "var(--gray-12)",
        fontFamily: "var(--default-font-family)",
        fontSize: "var(--font-size-2)",
        backgroundColor: "var(--color-panel-solid)",
        borderRadius: "var(--radius-4)",
        boxShadow: "var(--shadow-5)",
        ...style,
      }}
      {...props}
    />
  ),

  Calendar: ({ style, ...props }) => <div style={{ display: "grid", rowGap: 2, ...style }} {...props} />,

  Caption: ({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) => (
    <Flex align="center" gap="1">
      <select aria-label={labels.month} value={monthIndex} onChange={(event) => onMonthChange(Number(event.target.value))} style={captionStyle}>
        {months.map((name, index) => (
          <option key={name} value={index}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label={labels.year} value={year} onChange={(event) => onYearChange(Number(event.target.value))} style={captionStyle}>
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </Flex>
  ),

  /** `direction` already accounts for right to left, so the arrow follows it as is. */
  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <IconButton size="1" variant="ghost" color="gray" onClick={onClick} disabled={disabled} style={{ margin: 0 }} {...aria}>
      <span data-icon={direction === "next" ? "chevron-right" : "chevron-left"} style={{ display: "inline-flex" }}>
        {direction === "next" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </span>
    </IconButton>
  ),

  /**
   * One column header.
   *
   * No wrapping, because the column is one cell wide and locales whose short
   * weekday names are full words would otherwise make the row two lines tall.
   */
  Weekday: ({ label }) => (
    <Text as="div" size="1" color="gray" align="center" style={{ paddingBlock: "var(--space-1)", whiteSpace: "nowrap" }}>
      {label}
    </Text>
  ),

  /**
   * One cell of the grid.
   *
   * A `Button`, pinned to the cell size: `solid` when picked, `ghost`
   * otherwise, so the hover and the picked fill are Radix's own. Radix pulls
   * ghost buttons out by their padding; the cell is a fixed square, so the
   * margin is put back.
   *
   * Blocked days are styled from `data-disabled`, not Radix's `disabled`: the
   * component keeps them focusable, so it never sets `disabled` on them.
   *
   * The range band is a span behind the button, at a negative z-index: it
   * reaches half the gutter past each inline edge so neighbouring days meet
   * across the gap, and stops square at the button's edge on the two ends,
   * behind the picked day's rounded corners.
   */
  Day: ({ style, children, ...props }) => {
    const selected = has(props, "data-selected");
    const band = has(props, "data-in-range") || has(props, "data-in-preview");
    const start = has(props, "data-in-range") && has(props, "data-range-start");
    const end = has(props, "data-in-range") && has(props, "data-range-end");
    const bleed = "calc(var(--sdp-gap, 0.25rem) / -2 - 0.5px)";
    return (
      <Button
        variant={selected ? "solid" : "ghost"}
        color={selected ? undefined : "gray"}
        highContrast={!selected}
        style={{
          position: "relative",
          justifySelf: "center",
          width: DAY_SIZE,
          height: DAY_SIZE,
          margin: 0,
          padding: 0,
          overflow: "visible",
          borderRadius: "var(--radius-2)",
          fontWeight: "var(--font-weight-regular)",
          color: selected ? undefined : has(props, "data-outside") ? "var(--gray-a9)" : undefined,
          boxShadow: has(props, "data-today") && !selected ? "inset 0 0 0 1px var(--accent-8)" : "none",
          ...(has(props, "data-disabled") && { opacity: 0.3, cursor: "not-allowed" }),
          ...style,
        }}
        {...props}
      >
        {band && (
          <span
            data-band=""
            aria-hidden="true"
            style={{
              position: "absolute",
              zIndex: -1,
              insetBlock: 0,
              insetInlineStart: start ? 0 : bleed,
              insetInlineEnd: end ? 0 : bleed,
              backgroundColor: has(props, "data-in-range") ? "var(--accent-a4)" : "var(--accent-a3)",
              borderStartStartRadius: start ? "var(--radius-2)" : 0,
              borderEndStartRadius: start ? "var(--radius-2)" : 0,
              borderStartEndRadius: end ? "var(--radius-2)" : 0,
              borderEndEndRadius: end ? "var(--radius-2)" : 0,
            }}
          />
        )}
        {children}
      </Button>
    );
  },

  DayContent: ({ day }) => <span>{day.day}</span>,

  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <Flex wrap="wrap" align="center" gap="1" mt="2" pt="2" style={{ boxShadow: "inset 0 1px var(--gray-a5)" }}>
      {presets.map((preset) => (
        <Button key={preset.label} size="1" variant="soft" color="gray" onClick={() => onPreset(preset.value)}>
          {preset.label}
        </Button>
      ))}
      <Button size="1" variant="ghost" onClick={onToday} style={{ marginBlock: 0, marginInlineStart: "auto", marginInlineEnd: 0 }}>
        {todayLabel}
      </Button>
    </Flex>
  ),
};
