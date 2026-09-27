import { Box, Button, chakra, IconButton, NativeSelect, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { DatePickerComponents } from "../../../index";

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
  /** `colorPalette` is set once here; every part below inherits it. */
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
        "&[aria-disabled='true']": { opacity: 0.5, cursor: "not-allowed" },
      }}
      {...props}
    />
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

  /** Placement comes from the component's positioner as an inline style; this is only the surface. */
  Popup: ({ className, ...props }) => (
    <Box
      className={className}
      zIndex="50"
      width="18rem"
      p="2"
      rounded="md"
      borderWidth="1px"
      bg="bg.panel"
      color="fg"
      shadow="lg"
      {...props}
    />
  ),

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
