/**
 * DatePicker for MUI
 *
 * A `components` map that renders the slotsmith date picker with MUI
 * primitives, tested against MUI v7. Copy the file, keep the parts you want,
 * and pass the map as `components={muiDatePicker}`; every slot left out keeps
 * its fallback.
 */
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import type { DatePickerComponents } from "slotsmith/date-picker";

/**
 * MUI date picker parts
 *
 * Built from MUI's primitives — `Paper`, `IconButton`, `Select`, `Typography`,
 * `Box`, `Chip` — not from MUI's own date picker, which is a competing engine
 * rather than a set of parts and ships in a separate package. The result
 * wears Material and follows the theme, dark mode included.
 *
 * This is the reason the element parts `Omit` `color` from their DOM props:
 * MUI reuses that attribute name for its own semantic palette prop, so a slot
 * that forwarded the DOM `color` would collide with `<IconButton color>`.
 */

/** The day cell, in pixels. Matches `--sdp-cell`, so the square fills its column. */
const DAY_SIZE = 32;
/** The chip's corner, shared with the two ends of the band so they line up. */
const DAY_RADIUS = 8;

const ChevronIcon = ({ flip }: { flip: boolean }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    sx={{
      width: 18,
      height: 18,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      transform: flip ? "rotate(180deg)" : undefined,
    }}
  >
    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </Box>
);

/**
 * Caption select
 *
 * The month and year dropdowns share their whole look.
 *
 * These are `native`, not `MenuItem` lists, for two reasons that both come
 * from MUI rendering its menu as a `Modal`: a portalled menu is outside the
 * picker's root, so choosing a month would count as an outside click and
 * close the calendar; and with the portal disabled the modal marks the page
 * behind it `aria-hidden` while focus is still inside it, which the browser
 * reports.
 */
const captionSx: SxProps<Theme> = {
  "& .MuiNativeSelect-select": { py: 0.25, typography: "body2", fontWeight: 600 },
  "&::before, &::after": { display: "none" },
};

export const muiDatePicker: Partial<DatePickerComponents> = {
  Root: ({ className, ...props }) => (
    <Box className={className} sx={{ position: "relative", width: 1, maxWidth: 288 }} {...props} />
  ),

  /**
   * An outlined-input shell, so it sits beside MUI's TextFields without
   * looking pasted in. An invalid value takes the theme's `error` colour and
   * MUI's `Mui-error` state class, as a `TextField` with `error` does.
   */
  Trigger: ({ className, ...props }) => (
    <Box
      className={[className, props["aria-invalid"] ? "Mui-error" : undefined].filter(Boolean).join(" ") || undefined}
      sx={{
        cursor: "pointer",
        outline: 0,
        width: 1,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        typography: "body2",
        color: "text.primary",
        textAlign: "start",
        "&:hover": { borderColor: "text.primary" },
        "&[data-open], &:focus-visible": {
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
        },
        "&[aria-disabled='true']": { opacity: 0.5, cursor: "not-allowed" },
        "&.Mui-error": { borderColor: "error.main" },
        "&.Mui-error[data-open], &.Mui-error:focus-visible": {
          boxShadow: (theme) => `0 0 0 1px ${theme.palette.error.main}`,
        },
      }}
      {...props}
    />
  ),

  Value: ({ text, placeholder, empty }) => (
    <Typography
      variant="body2"
      noWrap
      sx={{ flex: 1, minWidth: 0 }}
      color={empty ? "text.secondary" : "text.primary"}
    >
      {empty ? placeholder : text}
    </Typography>
  ),

  Icon: ({ open }) => (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      sx={{
        width: 20,
        height: 20,
        flex: "none",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        color: open ? "primary.main" : "action.active",
      }}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" />
    </Box>
  ),

  Clear: ({ onClick, ...aria }) => (
    <IconButton
      size="small"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <Box
        component="svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
        sx={{ width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2.5 }}
      >
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
      </Box>
    </IconButton>
  ),

  /** Placement comes from the component's positioner as an inline style; this is only the surface. */
  Popup: ({ className, ...props }) => (
    <Paper className={className} elevation={8} sx={{ zIndex: 50, width: 288, p: 1 }} {...props} />
  ),

  Calendar: ({ className, ...props }) => (
    <Box className={className} sx={{ display: "grid", rowGap: "2px" }} {...props} />
  ),

  Caption: ({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Select
        native
        variant="standard"
        inputProps={{ "aria-label": labels.month }}
        value={monthIndex}
        onChange={(event) => onMonthChange(Number(event.target.value))}
        sx={captionSx}
      >
        {months.map((name, index) => (
          <option key={name} value={index}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        native
        variant="standard"
        inputProps={{ "aria-label": labels.year }}
        value={year}
        onChange={(event) => onYearChange(Number(event.target.value))}
        sx={captionSx}
      >
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
    </Box>
  ),

  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <IconButton size="small" onClick={onClick} disabled={disabled} {...aria}>
      <ChevronIcon flip={direction === "next"} />
    </IconButton>
  ),

  /**
   * One column header.
   *
   * `noWrap`, because the column is one cell wide and locales whose short
   * weekday names are full words would otherwise make the row two lines tall.
   */
  Weekday: ({ label }) => (
    <Typography
      variant="caption"
      align="center"
      noWrap
      color="text.secondary"
      sx={{ display: "block", py: 0.5, fontWeight: 600 }}
    >
      {label}
    </Typography>
  ),

  /**
   * One cell of the grid.
   *
   * An `IconButton`, which is square by construction, pinned to the cell size
   * so it neither stretches to the column nor carries the icon padding.
   *
   * Blocked days are styled from `data-disabled`, not `.Mui-disabled`: the
   * component keeps them focusable, so it never sets `disabled` on them.
   *
   * The band is a `::before` at a negative z-index: it reaches half the gutter
   * past each inline edge so neighbouring days meet across the gap, and it
   * sits behind both the picked chip and the label. `overflow: visible` is
   * asserted because that bleed is outside the button's own box.
   */
  Day: ({ className, ...props }) => (
    <IconButton
      className={className}
      sx={{
        position: "relative",
        justifySelf: "center",
        width: DAY_SIZE,
        height: DAY_SIZE,
        p: 0,
        overflow: "visible",
        borderRadius: `${DAY_RADIUS}px`,
        typography: "body2",
        fontSize: "0.8125rem",
        color: "text.primary",
        "&:hover": { bgcolor: "action.hover" },
        "&[data-disabled]": { opacity: 0.3, cursor: "not-allowed" },
        "&[data-outside]": { color: "text.disabled" },
        "&[data-today]": { boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}` },
        "&[data-in-range]::before, &[data-in-preview]::before": {
          content: '""',
          position: "absolute",
          zIndex: -1,
          insetBlock: 0,
          insetInline: "calc(var(--sdp-gap, 0.25rem) / -2 - 0.5px)",
          bgcolor: (theme) => `color-mix(in oklab, ${theme.palette.primary.main}, transparent 85%)`,
        },
        "&[data-in-range][data-range-start]::before": {
          insetInlineStart: 0,
          borderStartStartRadius: DAY_RADIUS,
          borderEndStartRadius: DAY_RADIUS,
        },
        "&[data-in-range][data-range-end]::before": {
          insetInlineEnd: 0,
          borderStartEndRadius: DAY_RADIUS,
          borderEndEndRadius: DAY_RADIUS,
        },
        "&[data-selected]": { bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600 },
        "&[data-selected]:hover": { bgcolor: "primary.dark" },
      }}
      {...props}
    />
  ),

  DayContent: ({ day }) => <span>{day.day}</span>,

  Footer: ({ presets, onPreset, onToday, todayLabel }) => (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
        mt: 1,
        pt: 1,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      {presets.map((preset) => (
        <Chip
          key={preset.label}
          size="small"
          variant="outlined"
          label={preset.label}
          onClick={() => onPreset(preset.value)}
        />
      ))}
      <Chip
        size="small"
        variant="outlined"
        label={todayLabel}
        onClick={onToday}
        sx={{ marginInlineStart: "auto", borderColor: "transparent", color: "text.secondary" }}
      />
    </Box>
  ),
};
