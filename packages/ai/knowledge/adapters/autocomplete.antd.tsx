/**
 * Autocomplete for Ant Design
 *
 * A `components` map that renders the slotsmith autocomplete with Ant Design
 * primitives, tested against Ant Design v6. Copy the file, keep the parts you
 * want, and pass the map as `components={antdAutocomplete}`; every slot left
 * out keeps its fallback.
 */
import { CheckOutlined, CloseCircleFilled, DownOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Divider, Empty, Input, Spin, Tag, Typography, theme } from "antd";
import type { InputRef } from "antd";
import { useCallback, useState, type FocusEvent, type ReactNode, type Ref } from "react";
import type {
  AutocompleteCheckSlotProps,
  AutocompleteClearSlotProps,
  AutocompleteComponents,
  AutocompleteCreateSlotProps,
  AutocompleteEmptySlotProps,
  AutocompleteErrorSlotProps,
  AutocompleteGroupLabelSlotProps,
  AutocompleteGroupSlotProps,
  AutocompleteIndicatorSlotProps,
  AutocompleteListSlotProps,
  AutocompleteLoadMoreSlotProps,
  AutocompleteLoadingSlotProps,
  AutocompleteOptionLabelSlotProps,
  AutocompleteOptionSlotProps,
  AutocompletePopupSlotProps,
  AutocompleteRootSlotProps,
  AutocompleteSearchSlotProps,
  AutocompleteSeparatorSlotProps,
  AutocompleteTagSlotProps,
  AutocompleteToggleSlotProps,
  AutocompleteTriggerInputSlotProps,
  AutocompleteTriggerSlotProps,
  AutocompleteValueSlotProps,
} from "slotsmith/autocomplete";

/**
 * Ant Design autocomplete parts
 *
 * Built from Ant Design v6 primitives — `Input`, `Tag`, `Button`, `Spin`,
 * `Empty`, `Typography` — rather than from Ant's own `Select` or
 * `AutoComplete`, which are competing engines. The element parts are plain
 * elements given the look of Ant's select from the theme's tokens: their
 * state arrives as `data-*` props, so each one reads its own and picks the
 * matching token.
 */

/**
 * Has flag
 *
 * @param props - An element part's props.
 * @param name - A `data-*` attribute.
 * @returns Whether the engine set it.
 */
const has = (props: object, name: `data-${string}`) => (props as Record<string, unknown>)[name] !== undefined;

/**
 * Ant root
 *
 * The box the popup is measured against.
 */
const AntRoot = ({ style, ...props }: AutocompleteRootSlotProps) => (
  <div style={{ position: "relative", ...style }} {...props} />
);

/**
 * Ant trigger
 *
 * The outlined field of Ant's select: the primary border and focus ring
 * while open, the disabled fill when disabled, and the error border and
 * ring of `status="error"` when the value is invalid.
 *
 * With the search in the trigger it is the field around the borderless
 * `Input`, and the border and ring also follow focus in that input.
 */
function AntTrigger({ style, onFocus, onBlur, ...props }: AutocompleteTriggerSlotProps) {
  const { token } = theme.useToken();
  const [focused, setFocused] = useState(false);
  const searchInTrigger = has(props, "data-search-in");
  const open = has(props, "data-open") || (searchInTrigger && focused);
  const disabled = has(props, "data-disabled");
  const invalid = has(props, "data-invalid");
  const edge = invalid ? token.colorError : open ? token.colorPrimary : token.colorBorder;
  const ring = invalid ? token.colorErrorOutline : token.controlOutline;
  return (
    <div
      onFocus={(event: FocusEvent<HTMLDivElement>) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        onBlur?.(event);
      }}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: token.paddingXXS,
        minHeight: token.controlHeight,
        paddingBlock: 2,
        paddingInline: token.paddingSM - 1,
        color: token.colorText,
        fontSize: token.fontSize,
        background: disabled ? token.colorBgContainerDisabled : token.colorBgContainer,
        border: `${token.lineWidth}px ${token.lineType} ${edge}`,
        borderRadius: token.borderRadius,
        boxShadow: open ? `0 0 0 ${token.controlOutlineWidth}px ${ring}` : undefined,
        cursor: disabled ? "not-allowed" : searchInTrigger ? "text" : "pointer",
        transition: `all ${token.motionDurationMid}`,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Ant value
 *
 * The selected label, or the placeholder in the placeholder colour.
 */
function AntValue({ label, placeholder, empty }: AutocompleteValueSlotProps) {
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
      {empty ? placeholder : label}
    </Typography.Text>
  );
}

/**
 * Ant tag
 *
 * A `Tag` per selected value. Ant renders its close icon as a focusable
 * `role="button"` that answers Enter and Space; the `closable` object gives it
 * the accessible name. `onClose` prevents the default, which would hide the
 * tag itself, and stops the click from reaching the trigger.
 */
const AntTag = ({ label, onRemove, removeLabel, disabled }: AutocompleteTagSlotProps) => (
  <Tag
    style={{ marginInlineEnd: 0 }}
    closable={disabled ? false : { "aria-label": removeLabel }}
    onClose={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onRemove();
    }}
  >
    {label}
  </Tag>
);

/**
 * Ant clear
 *
 * A text `Button` with Ant's clear icon. The click is stopped so it does not
 * also reach the trigger and reopen the popup.
 */
const AntClear = ({ onClick, ...aria }: AutocompleteClearSlotProps) => (
  <Button
    type="text"
    size="small"
    icon={<CloseCircleFilled />}
    style={{ marginInlineStart: "auto" }}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  />
);

/**
 * Ant indicator
 *
 * A small `Spin` while a first page is loading, the select's chevron
 * otherwise.
 */
function AntIndicator({ open, loading }: AutocompleteIndicatorSlotProps) {
  const { token } = theme.useToken();
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", marginInlineStart: "auto", color: token.colorTextQuaternary }}>
      {loading ? <Spin size="small" /> : <DownOutlined rotate={open ? 180 : 0} style={{ fontSize: token.fontSizeSM }} />}
    </span>
  );
}

/**
 * Ant popup
 *
 * The elevated surface of Ant's dropdowns. The component positions it, so
 * the part only adds the surface to the style it receives.
 */
function AntPopup({ style, ...props }: AutocompletePopupSlotProps) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        zIndex: token.zIndexPopupBase,
        overflow: "auto",
        padding: token.paddingXXS,
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Assign ref
 *
 * @param ref - The ref the engine passed.
 * @param value - The element to hand it.
 */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * Ant search
 *
 * A borderless `Input` with a search icon. Ant's `ref` is an object that
 * holds the input rather than the input itself, so the engine's ref is
 * handed `input` from it. Everything else — the `role`, the aria wiring,
 * the key handler — Ant passes to the `<input>`. Its `size` is a variant
 * rather than the HTML attribute, which is why the slot's props leave `size`
 * out. A caller's `style` is merged over the skin's rather than replacing it.
 */
function AntSearch({ ref, style, ...props }: AutocompleteSearchSlotProps) {
  const { token } = theme.useToken();
  const inputRef = useCallback((instance: InputRef | null) => assignRef(ref, instance?.input ?? null), [ref]);
  return (
    <Input
      ref={inputRef}
      variant="borderless"
      prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
      style={{ borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`, borderRadius: 0, ...style }}
      {...props}
    />
  );
}

/**
 * Ant trigger input
 *
 * A borderless `Input` that is the combobox when the search is in the
 * trigger, taking the space the tags leave. It shows `status="error"` when
 * invalid. As with the search box, the engine's ref is handed the input
 * from Ant's ref object.
 */
function AntTriggerInput({ ref, style, ...props }: AutocompleteTriggerInputSlotProps) {
  const inputRef = useCallback((instance: InputRef | null) => assignRef(ref, instance?.input ?? null), [ref]);
  return (
    <Input
      ref={inputRef}
      variant="borderless"
      status={props["aria-invalid"] ? "error" : undefined}
      style={{ flex: "1 0 80px", minWidth: 80, paddingInline: 4, ...style }}
      {...props}
    />
  );
}

/**
 * Ant toggle
 *
 * A text `Button` holding the chevron, kept out of the tab order. Ant's
 * `type` is its look, so the HTML type goes through `htmlType`.
 */
const AntToggle = ({ type: _type, ...props }: AutocompleteToggleSlotProps) => (
  <Button type="text" htmlType="button" size="small" {...props} />
);

/**
 * Ant list
 *
 * The `<ul>` the listbox role goes on.
 */
const AntList = ({ style, ...props }: AutocompleteListSlotProps) => (
  <ul style={{ margin: 0, padding: 0, listStyle: "none", ...style }} {...props} />
);

/**
 * Ant option
 *
 * A row of Ant's select menu: the hover fill on the highlighted row, the
 * active fill and strong weight on a selected one. Disabled rows stay
 * visible and only look unavailable: the engine is what refuses them.
 */
function AntOption({ style, ...props }: AutocompleteOptionSlotProps) {
  const { token } = theme.useToken();
  const disabled = has(props, "data-disabled");
  const selected = has(props, "data-selected");
  const highlighted = has(props, "data-highlighted");
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: token.paddingXS,
        minHeight: token.controlHeight,
        paddingBlock: (token.controlHeight - token.fontSize * token.lineHeight) / 2,
        paddingInline: token.paddingSM,
        borderRadius: token.borderRadiusSM,
        color: disabled ? token.colorTextDisabled : token.colorText,
        fontWeight: selected ? token.fontWeightStrong : undefined,
        background: selected ? token.controlItemBgActive : highlighted ? token.controlItemBgHover : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Ant group
 *
 * The group's own `<ul>`, carrying `role="group"`, inside a bare `<li>`.
 */
const AntGroup = ({ label: _label, labelId: _labelId, style, ...props }: AutocompleteGroupSlotProps) => (
  <li role="none">
    <ul style={{ margin: 0, padding: 0, listStyle: "none", ...style }} {...props} />
  </li>
);

/**
 * Ant group label
 *
 * The look of a group title in Ant's select menu, in the description colour
 * at the small font size, compacted to 28px: the virtual list's default
 * `groupLabelSize`.
 */
function AntGroupLabel({ label, ...props }: AutocompleteGroupLabelSlotProps) {
  const { token } = theme.useToken();
  return (
    <li
      style={{
        minHeight: 28,
        paddingBlock: (28 - token.fontSizeSM * token.lineHeightSM) / 2,
        paddingInline: token.paddingSM,
        color: token.colorTextDescription,
        fontSize: token.fontSizeSM,
        cursor: "default",
        boxSizing: "border-box",
      }}
      {...props}
    >
      {label}
    </li>
  );
}

/**
 * Ant separator
 *
 * Ant's `Divider` in a hidden list item, run out to the popup's edges.
 */
function AntSeparator({ style, ...props }: AutocompleteSeparatorSlotProps) {
  const { token } = theme.useToken();
  return (
    <li style={{ marginInline: -token.paddingXXS, ...style }} {...props}>
      <Divider style={{ marginBlock: token.marginXXS }} />
    </li>
  );
}

/**
 * Ant option label
 *
 * The row's text, cut short rather than wrapped.
 */
const AntOptionLabel = ({ label }: AutocompleteOptionLabelSlotProps) => (
  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{label}</span>
);

/**
 * Ant check
 *
 * The select's check mark on a selected row, hidden from assistive
 * technology so it stays out of the option's accessible name.
 */
function AntCheck({ selected }: AutocompleteCheckSlotProps) {
  const { token } = theme.useToken();
  return selected ? (
    <span aria-hidden="true" style={{ display: "inline-flex", color: token.colorPrimary }}>
      <CheckOutlined />
    </span>
  ) : null;
}

/**
 * Ant empty state
 *
 * Ant's simple `Empty` picture over the message.
 */
const AntEmpty = ({ message }: AutocompleteEmptySlotProps) => (
  <li>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={message} />
  </li>
);

/**
 * Ant status row
 *
 * The padded row the loading and error states share.
 */
function AntStatusRow({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <li style={{ display: "flex", alignItems: "center", gap: token.paddingXS, padding: `${token.paddingXS}px ${token.paddingSM}px` }}>
      {children}
    </li>
  );
}

/**
 * Ant loading state
 *
 * A small `Spin` beside the message.
 */
const AntLoading = ({ message }: AutocompleteLoadingSlotProps) => (
  <AntStatusRow>
    <Spin size="small" />
    <Typography.Text type="secondary">{message}</Typography.Text>
  </AntStatusRow>
);

/**
 * Ant error state
 *
 * The message in the danger colour and a retry `Button`.
 */
const AntError = ({ error, onRetry, retryLabel }: AutocompleteErrorSlotProps) => (
  <AntStatusRow>
    <Typography.Text type="danger">{error}</Typography.Text>
    {onRetry ? (
      <Button size="small" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </AntStatusRow>
);

/**
 * Ant create row
 *
 * A full-width text `Button` offering to create whatever was searched for.
 */
const AntCreate = ({ onCreate, loading, label }: AutocompleteCreateSlotProps) => (
  <li>
    <Button type="text" block loading={loading} onClick={onCreate}>
      {label}
    </Button>
  </li>
);

/**
 * Ant load-more row
 *
 * The paging sentinel, which is also a `Button` so the next page is
 * reachable without a pointer.
 */
const AntLoadMore = ({ ref, onLoadMore, loading, label }: AutocompleteLoadMoreSlotProps) => (
  <li ref={ref}>
    <Button type="text" block disabled={loading} onClick={onLoadMore}>
      {label}
    </Button>
  </li>
);

/**
 * Ant Design components
 *
 * The slot map an Ant Design v6 project would pass as `components`.
 */
export const antdAutocomplete: Partial<AutocompleteComponents> = {
  Root: AntRoot,
  Trigger: AntTrigger,
  TriggerInput: AntTriggerInput,
  Toggle: AntToggle,
  Value: AntValue,
  Tag: AntTag,
  Clear: AntClear,
  Indicator: AntIndicator,
  Popup: AntPopup,
  Search: AntSearch,
  List: AntList,
  Option: AntOption,
  OptionLabel: AntOptionLabel,
  Check: AntCheck,
  Group: AntGroup,
  GroupLabel: AntGroupLabel,
  Separator: AntSeparator,
  Empty: AntEmpty,
  Loading: AntLoading,
  Error: AntError,
  Create: AntCreate,
  LoadMore: AntLoadMore,
};
