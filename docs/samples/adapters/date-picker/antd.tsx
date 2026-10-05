/**
 * DatePicker for Ant Design
 *
 * A `components` map that renders the slotsmith date picker with Ant Design
 * primitives, tested against Ant Design v6. Copy the file, keep the parts you
 * want, and pass the map as `components={antdComponents}`; every slot left out
 * keeps its fallback.
 */
import { CalendarOutlined, CloseCircleFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Flex, Typography, theme } from "antd";
import type { GlobalToken } from "antd";
import type { CSSProperties } from "react";
import type { DatePickerComponents } from "slotsmith/date-picker";

/**
 * Ant Design date picker parts
 *
 * Built from Ant Design v6 primitives — `Button`, `Flex`, `Typography` and
 * Ant's icons — not from Ant's own `DatePicker`, which is a competing engine
 * rather than a set of parts. The surfaces take the look of Ant's pickers
 * from the theme's tokens; their state arrives as `data-*` props, so each part
 * reads its own and picks the matching token.
 *
 * This is also why the element parts `Omit` `color` from their DOM props:
 * Ant's `Button` has a `color` prop of its own, a preset palette, which a
 * forwarded DOM `color` would collide with.
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
 * strong weight, like the header of Ant's own picker.
 *
 * They are native selects, not Ant's `Select`: its menu is portalled out of
 * the picker, so choosing a month would count as an outside click and close
 * the calendar.
 *
 * @param token - The theme's tokens.
 * @returns The style.
 */
const captionStyle = (token: GlobalToken): CSSProperties => ({
  padding: `0 ${token.paddingXXS}px`,
  font: "inherit",
  fontWeight: token.fontWeightStrong,
  color: token.colorText,
  background: "transparent",
  border: 0,
  borderRadius: token.borderRadiusSM,
  cursor: "pointer",
});

/**
 * Ant Design components
 *
 * The slot map an Ant Design v6 project would pass as `components`. Every
 * part reads the theme's tokens, so a `ConfigProvider` theme, dark included,
 * reaches the calendar without extra wiring.
 */
export const antdComponents: Partial<DatePickerComponents> = {
  /** The box the popup is placed against, at the width of Ant's pickers. */
  Root: ({ style, ...props }) => <div style={{ position: "relative", width: "100%", maxWidth: 288, ...style }} {...props} />,

  /** The outlined field of Ant's pickers: the primary border and focus ring while open. */
  Trigger: function AntTrigger({ style, ...props }) {
    const { token } = theme.useToken();
    const open = has(props, "data-open");
    const disabled = has(props, "data-disabled");
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: token.paddingXS,
          width: "100%",
          minHeight: token.controlHeight,
          paddingBlock: token.paddingXXS,
          paddingInline: token.paddingSM - 1,
          color: token.colorText,
          fontSize: token.fontSize,
          textAlign: "start",
          outline: 0,
          background: disabled ? token.colorBgContainerDisabled : token.colorBgContainer,
          border: `${token.lineWidth}px ${token.lineType} ${open ? token.colorPrimary : token.colorBorder}`,
          borderRadius: token.borderRadius,
          boxShadow: open ? `0 0 0 ${token.controlOutlineWidth}px ${token.controlOutline}` : undefined,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: `all ${token.motionDurationMid}`,
          ...style,
        }}
        {...props}
      />
    );
  },

  /** The trigger text on one ellipsised line, in the placeholder colour while empty. */
  Value: function AntValue({ text, placeholder, empty }) {
    const { token } = theme.useToken();
    return (
      <Typography.Text
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          color: empty ? token.colorTextPlaceholder : undefined,
        }}
      >
        {empty ? placeholder : text}
      </Typography.Text>
    );
  },

  /** The calendar glyph, in the primary colour while the popup is open. */
  Icon: function AntIcon({ open }) {
    const { token } = theme.useToken();
    return (
      <span aria-hidden="true" style={{ display: "inline-flex", color: open ? token.colorPrimary : token.colorTextQuaternary }}>
        <CalendarOutlined />
      </span>
    );
  },

  /** A text `Button` with the filled close glyph; the click stops here so it does not also open the popup. */
  Clear: ({ onClick, ...aria }) => (
    <Button
      type="text"
      size="small"
      icon={<CloseCircleFilled />}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    />
  ),

  /** Placement comes from the component's positioner as an inline style; this is only the surface. */
  Popup: function AntPopup({ style, ...props }) {
    const { token } = theme.useToken();
    return (
      <div
        style={{
          zIndex: token.zIndexPopupBase,
          width: 288,
          padding: token.paddingXS,
          background: token.colorBgElevated,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
          ...style,
        }}
        {...props}
      />
    );
  },

  /** The grid of weeks, with a small gap between rows. */
  Calendar: ({ style, ...props }) => <div style={{ display: "grid", rowGap: 2, ...style }} {...props} />,

  /** Native month and year selects side by side, borderless like the header of Ant's picker. */
  Caption: function AntCaption({ monthIndex, year, months, years, onMonthChange, onYearChange, labels }) {
    const { token } = theme.useToken();
    return (
      <Flex align="center" gap={token.paddingXXS}>
        <select
          aria-label={labels.month}
          value={monthIndex}
          onChange={(event) => onMonthChange(Number(event.target.value))}
          style={captionStyle(token)}
        >
          {months.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={labels.year}
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
          style={captionStyle(token)}
        >
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Flex>
    );
  },

  /** `direction` already accounts for right to left, so the arrow follows it as is. */
  Nav: ({ direction, onClick, disabled, ...aria }) => (
    <Button
      type="text"
      size="small"
      icon={direction === "next" ? <RightOutlined /> : <LeftOutlined />}
      onClick={onClick}
      disabled={disabled}
      {...aria}
    />
  ),

  /**
   * One column header.
   *
   * No wrapping, because the column is one cell wide and locales whose short
   * weekday names are full words would otherwise make the row two lines tall.
   */
  Weekday: function AntWeekday({ label }) {
    const { token } = theme.useToken();
    return (
      <Typography.Text
        type="secondary"
        style={{ display: "block", paddingBlock: token.paddingXXS, fontSize: token.fontSizeSM, textAlign: "center", whiteSpace: "nowrap" }}
      >
        {label}
      </Typography.Text>
    );
  },

  /**
   * One cell of the grid.
   *
   * A `Button`, pinned to the cell size: `primary` when picked, `text`
   * otherwise, so the hover and the picked fill are Ant's own. The HTML
   * `type` moves to `htmlType`, since Ant's `type` is the variant.
   *
   * Blocked days are styled from `data-disabled`, not Ant's `disabled`: the
   * component keeps them focusable, so it never sets `disabled` on them.
   *
   * The range band is a span behind the button, at a negative z-index: it
   * reaches half the gutter past each inline edge so neighbouring days meet
   * across the gap, and stops square at the button's edge on the two ends,
   * behind the picked day's rounded corners.
   */
  Day: function AntDay({ type, style, children, ...props }) {
    const { token } = theme.useToken();
    const selected = has(props, "data-selected");
    const band = has(props, "data-in-range") || has(props, "data-in-preview");
    const start = has(props, "data-in-range") && has(props, "data-range-start");
    const end = has(props, "data-in-range") && has(props, "data-range-end");
    const bleed = "calc(var(--sdp-gap, 0.25rem) / -2 - 0.5px)";
    return (
      <Button
        type={selected ? "primary" : "text"}
        htmlType={type}
        style={{
          position: "relative",
          justifySelf: "center",
          width: DAY_SIZE,
          minWidth: DAY_SIZE,
          height: DAY_SIZE,
          padding: 0,
          overflow: "visible",
          borderRadius: token.borderRadius,
          fontSize: token.fontSizeSM + 1,
          color: selected ? undefined : has(props, "data-outside") ? token.colorTextDisabled : token.colorText,
          boxShadow: has(props, "data-today") && !selected ? `inset 0 0 0 ${token.lineWidth}px ${token.colorPrimary}` : "none",
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
              background: has(props, "data-in-range") ? token.controlItemBgActive : token.controlItemBgHover,
              borderStartStartRadius: start ? token.borderRadius : 0,
              borderEndStartRadius: start ? token.borderRadius : 0,
              borderStartEndRadius: end ? token.borderRadius : 0,
              borderEndEndRadius: end ? token.borderRadius : 0,
            }}
          />
        )}
        {children}
      </Button>
    );
  },

  /** The day number alone; the `Day` button around it carries every state. */
  DayContent: ({ day }) => <span>{day.day}</span>,

  /** The preset `Button`s under a hairline, and a link `Button` for today at the far end. */
  Footer: function AntFooter({ presets, onPreset, onToday, todayLabel }) {
    const { token } = theme.useToken();
    return (
      <Flex
        wrap
        align="center"
        gap={token.paddingXXS}
        style={{ marginTop: token.paddingXS, paddingTop: token.paddingXS, borderTop: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}` }}
      >
        {presets.map((preset) => (
          <Button key={preset.label} size="small" onClick={() => onPreset(preset.value)}>
            {preset.label}
          </Button>
        ))}
        <Button type="link" size="small" onClick={onToday} style={{ marginInlineStart: "auto" }}>
          {todayLabel}
        </Button>
      </Flex>
    );
  },
};
