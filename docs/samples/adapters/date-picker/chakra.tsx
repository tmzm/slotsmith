/**
 * DatePicker for Chakra UI
 *
 * A `components` map that renders the slotsmith date picker with Chakra UI
 * primitives, tested against Chakra UI v3. Copy the file, keep the parts you
 * want, and pass the map as `components={chakraComponents}`; every slot left
 * out keeps its fallback.
 */
import { Box, Button, chakra, IconButton, NativeSelect, Popover, Portal, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useDatePickerContext, type DatePickerComponents } from "slotsmith/date-picker";

/**
 * Chakra date picker parts
 *
 * The `components` map against Chakra UI v3 primitives — `Box`, `Button`,
 * `IconButton`, `NativeSelect`, `Text` and the `chakra` factory — written
 * against Chakra's semantic tokens, so it follows the theme the way the
 * table's Chakra parts do.
 *
 * `NativeSelect` rather than Chakra's `Select` collection on purpose: the
 * collection renders its list in a portal, and the picker closes on any
 * pointer-down outside its own root.
 */

/** The day cell, on Chakra's spacing scale. `8` is 2rem, which matches `--sdp-cell`. */
const DAY_SIZE = "8";

/**
 * Glyph
 *
 * A styled `<svg>` from Chakra's factory rather than `Icon`, which treats its
 * child as the element to render and so swallows a multi-path drawing.
 */
const Glyph = chakra("svg");

const Chevron = ({ flip }: { flip: boolean }) => (
  <Glyph
    width="4"
    height="4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    transform={flip ? "rotate(180deg)" : undefined}
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </Glyph>
);

/**
 * Caption select
 *
 * The month and year dropdowns are the same control with different options.
 *
 * @param label - Accessible name for the field.
 * @param value - The option currently shown.
 * @param onValueChange - Receives the new option as a number.
 * @param children - The `<option>` list.
 * @returns A plain Chakra `NativeSelect`.
 */
const CaptionSelect = ({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  children: ReactNode;
}) => (
  <NativeSelect.Root size="xs" width="auto" variant="plain">
    <NativeSelect.Field
      aria-label={label}
      value={value}
      fontWeight="semibold"
      onChange={(event) => onValueChange(Number(event.currentTarget.value))}
    >
      {children}
    </NativeSelect.Field>
    <NativeSelect.Indicator />
  </NativeSelect.Root>
);

export const chakraComponents: Partial<DatePickerComponents> = {
  /** `colorPalette` is set here for the trigger, and again on the popover, which renders in a portal outside it. */
  Root: ({ className, ...props }) => (
    <Box className={className} colorPalette="blue" position="relative" width="full" maxWidth="18rem" {...props} />
  ),

  Trigger: ({ className, ...props }) => (
    <Box
      className={className}
      display="flex"
      alignItems="center"
      gap="2"
      width="full"
      minHeight="10"
      px="3"
      py="1.5"
      rounded="md"
      borderWidth="1px"
      bg="bg.panel"
      color="fg"
      textStyle="sm"
      cursor="pointer"
      outline="none"
      css={{
        "&:hover": { borderColor: "border.emphasized" },
        "&[data-open], &:focus-visible": { borderColor: "colorPalette.solid" },
        "&[aria-disabled='true'], &[data-trigger='input'][data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
        "&[data-trigger='input']": { cursor: "text", paddingInlineEnd: "1.5" },
        "&[data-trigger='input']:focus-within": { borderColor: "colorPalette.solid" },
        /** Chakra's own invalid condition and token, as its `Input` uses them. */
        _invalid: { borderColor: "border.error" },
        "&[data-invalid]": { borderColor: "border.error" },
      }}
      {...props}
    />
  ),

  /** A bare `chakra.input`: the trigger frame holds the border. */
  Input: (props) => (
    <chakra.input
      flex="1"
      minWidth="0"
      bg="transparent"
      border="0"
      outline="none"
      textStyle="sm"
      color="fg"
      css={{ "&::placeholder": { color: "fg.muted" }, "&:disabled": { cursor: "not-allowed" } }}
      {...props}
    />
  ),

  /** A ghost `IconButton` around the calendar glyph. */
  Toggle: ({ children, ...props }) => (
    <IconButton size="2xs" variant="ghost" {...props}>
      {children}
    </IconButton>
  ),

  Value: ({ text, placeholder, empty }) => (
    <Text as="span" flex="1" minWidth="0" truncate textStyle="sm" color={empty ? "fg.muted" : "fg"}>
      {empty ? placeholder : text}
    </Text>
  ),

  Icon: ({ open }) => (
    <Glyph
      width="4"
      height="4"
      flex="none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      color={open ? "colorPalette.solid" : "fg.muted"}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </Glyph>
  ),

  Clear: ({ onClick, ...aria }) => (
    <IconButton
      size="2xs"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <Glyph
        width="3"
        height="3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </Glyph>
    </IconButton>
  ),

  /**
   * Chakra's `Popover`: it portals the calendar, places it against the trigger
   * and draws Chakra's popover surface. The picker owns the open state, the
   * focus and closing, so the popover's own are turned off. The content keeps
   * every prop the part is given, its `id` included, which is how the picker
   * knows the portaled calendar is still part of it; the built-in position
   * style is left out.
   */
  Popup: function ChakraPopup({ className, style: _style, ...props }) {
    const { position } = useDatePickerContext();
    const anchor = position.anchor;
    if (!anchor) return null;
    return (
      <Popover.Root
        open
        // The popover finds its content by this id, and so does the picker.
        ids={{ content: props.id }}
        modal={false}
        autoFocus={false}
        closeOnEscape={false}
        closeOnInteractOutside={false}
        positioning={{
          placement: position.placement === "top-start" ? "top-start" : "bottom-start",
          gutter: 4,
          getAnchorRect: () => anchor.getBoundingClientRect(),
        }}
      >
        <Portal>
          <Popover.Positioner>
            {/* Its own stacking context, so the range band behind each day stays above the surface. */}
            <Popover.Content className={className} colorPalette="blue" width="18rem" p="2" isolation="isolate" {...props} />
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    );
  },

  Calendar: ({ className, ...props }) => <Box className={className} display="grid" rowGap="0.5" {...props} />,

  Caption: ({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) => (
    <Box display="flex" alignItems="center" gap="1">
      <CaptionSelect label={labels.month} value={monthIndex} onValueChange={onMonthChange}>
        {months.map((name, index) => (
          <option key={name} value={index}>
            {name}
          </option>
        ))}
      </CaptionSelect>
      <CaptionSelect label={labels.year} value={year} onValueChange={onYearChange}>
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </CaptionSelect>
    </Box>
  ),

  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <IconButton size="xs" variant="ghost" disabled={disabled} onClick={onClick} {...aria}>
      <Chevron flip={direction === "next"} />
    </IconButton>
  ),

  /**
   * One column header.
   *
   * Clipped rather than wrapped: the column is one cell wide, and locales
   * whose short weekday names are full words would make the row two lines
   * tall.
   */
  Weekday: ({ label }) => (
    <Text
      as="span"
      display="block"
      truncate
      py="1"
      textAlign="center"
      textStyle="xs"
      fontWeight="semibold"
      color="fg.muted"
    >
      {label}
    </Text>
  ),

  /**
   * One cell of the grid.
   *
   * An `IconButton` at a fixed `boxSize`, so the button is exactly as wide as
   * it is tall rather than stretching to the column. Blocked days are dimmed
   * from `data-disabled`: they stay focusable, so `:disabled` never matches.
   *
   * The band is a `_before` layer at a negative z-index: it reaches half the
   * gutter past each inline edge so neighbouring days meet across the gap,
   * and it sits behind both the picked chip and the label.
   */
  Day: ({ className, ...props }) => (
    <IconButton
      className={className}
      variant="ghost"
      boxSize={DAY_SIZE}
      minWidth={DAY_SIZE}
      justifySelf="center"
      position="relative"
      overflow="visible"
      p="0"
      rounded="md"
      bg="transparent"
      color="fg"
      textStyle="sm"
      fontWeight="normal"
      css={{
        "&[data-disabled]": { opacity: 0.3, cursor: "not-allowed" },
        "&[data-outside]": { color: "fg.muted" },
        "&[data-today]": { boxShadow: "inset 0 0 0 1px var(--chakra-colors-color-palette-solid)" },
        "&[data-in-range], &[data-in-preview]": {
          _before: {
            content: '""',
            position: "absolute",
            zIndex: -1,
            insetBlock: "0",
            insetInline: "calc(var(--sdp-gap, 0.25rem) / -2 - 0.5px)",
            bg: "colorPalette.subtle",
          },
        },
        "&[data-in-range][data-range-start]": {
          _before: { insetInlineStart: "0", borderStartStartRadius: "md", borderEndStartRadius: "md" },
        },
        "&[data-in-range][data-range-end]": {
          _before: { insetInlineEnd: "0", borderStartEndRadius: "md", borderEndEndRadius: "md" },
        },
        "&[data-selected], &[data-selected]:hover": {
          bg: "colorPalette.solid",
          color: "colorPalette.contrast",
          fontWeight: "semibold",
        },
      }}
      {...props}
    />
  ),

  DayContent: ({ day }) => <span>{day.day}</span>,

  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <Box
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      gap="1"
      mt="2"
      pt="2"
      borderTopWidth="1px"
      borderColor="border"
    >
      {presets.map((preset) => (
        <Button
          key={preset.label}
          size="xs"
          variant="outline"
          rounded="full"
          onClick={() => onPreset(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      <Button size="xs" variant="ghost" color="fg.muted" marginInlineStart="auto" onClick={onToday}>
        {todayLabel}
      </Button>
    </Box>
  ),
};
