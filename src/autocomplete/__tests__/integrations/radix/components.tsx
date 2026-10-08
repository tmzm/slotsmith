/**
 * Autocomplete for Radix Themes
 *
 * A `components` map that renders the slotsmith autocomplete with Radix Themes
 * primitives, tested against Radix Themes v3. Copy the file, keep the parts
 * you want, and pass the map as `components={radixAutocomplete}`; every slot
 * left out keeps its fallback.
 *
 * This is Radix Themes (`@radix-ui/themes`), the styled library; an app on the
 * bare Radix primitives wants the shadcn/ui adapter, which is built on them.
 */
import { CheckIcon, ChevronDownIcon, Cross2Icon, CrossCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Badge, Box, Button, Flex, IconButton, Separator, Spinner, Text, TextField } from "@radix-ui/themes";
import { useState, type FocusEvent, type ReactNode } from "react";
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
} from "../../../index";

/**
 * Radix Themes autocomplete parts
 *
 * Built from Radix Themes v3 — `TextField`, `Badge`, `Button`,
 * `IconButton`, `Spinner`, `Text` and Radix icons — rather than from its
 * `Select` or `Popover`, which would position the popup a second time. The
 * element parts are plain elements given the look of Radix's select from its
 * variables (`--accent-*`, `--gray-*`, `--color-panel-solid`), so they follow
 * the app's `<Theme accentColor appearance>`; their state arrives as
 * `data-*` props, so each one reads its own. The app must import
 * `@radix-ui/themes/styles.css`, as every Radix Themes app already does.
 *
 * Radix's `Button` and `IconButton` render a `<button>` with no `type`, which
 * would submit a surrounding form, so each one here is given
 * `type="button"` ahead of the slot's props.
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
 * Radix root
 *
 * The box the popup is measured against.
 */
const RadixRoot = ({ style, ...props }: AutocompleteRootSlotProps) => (
  <div style={{ position: "relative", ...style }} {...props} />
);

/**
 * Radix trigger
 *
 * The surface field of Radix's `TextField`: a hairline in the gray scale,
 * Radix's focus outline while open, and the disabled fill when disabled. An
 * invalid value switches the field to the red scale with
 * `data-accent-color="red"`, which is what Radix's own `color="red"` sets.
 *
 * With the search in the trigger it is the field around the `TextField`,
 * and the focus outline also follows focus in that input.
 */
function RadixTrigger({ style, onFocus, onBlur, ...props }: AutocompleteTriggerSlotProps) {
  const [focused, setFocused] = useState(false);
  const searchInTrigger = has(props, "data-search-in");
  const open = has(props, "data-open") || (searchInTrigger && focused);
  const disabled = has(props, "data-disabled");
  const invalid = has(props, "data-invalid");
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
      data-accent-color={invalid ? "red" : undefined}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--space-1)",
        minHeight: "var(--space-6)",
        paddingBlock: 2,
        paddingInline: "var(--space-2)",
        color: disabled ? "var(--gray-a11)" : "var(--gray-12)",
        fontFamily: "var(--default-font-family)",
        fontSize: "var(--font-size-2)",
        background: disabled ? "var(--gray-a2)" : "var(--color-surface)",
        boxShadow: `inset 0 0 0 1px ${invalid ? "var(--red-a8)" : "var(--gray-a7)"}`,
        borderRadius: "var(--radius-2)",
        outline: open ? `2px solid ${invalid ? "var(--red-8)" : "var(--focus-8)"}` : undefined,
        outlineOffset: -1,
        cursor: disabled ? "not-allowed" : searchInTrigger ? "text" : "pointer",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Radix value
 *
 * The selected label, or the placeholder in Radix's placeholder gray.
 */
const RadixValue = ({ label, placeholder, empty }: AutocompleteValueSlotProps) => (
  <Text size="2" truncate style={{ flex: 1, minWidth: 0, color: empty ? "var(--gray-a10)" : undefined }}>
    {empty ? placeholder : label}
  </Text>
);

/**
 * Radix tag
 *
 * A `Badge` per selected value, with a ghost `IconButton` to remove it. The
 * click is stopped so it does not also reach the trigger and open the popup.
 */
const RadixTag = ({ label, onRemove, removeLabel, disabled }: AutocompleteTagSlotProps) => (
  <Badge size="2" variant="soft">
    {label}
    {!disabled && (
      <IconButton
        type="button"
        size="1"
        variant="ghost"
        radius="full"
        aria-label={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        style={{ margin: 0, width: "auto", height: "auto", padding: 1 }}
      >
        <Cross2Icon width={12} height={12} />
      </IconButton>
    )}
  </Badge>
);

/**
 * Radix clear
 *
 * A ghost `IconButton` with a crossed circle. The click is stopped so it does
 * not also reach the trigger and reopen the popup.
 */
const RadixClear = ({ onClick, ...aria }: AutocompleteClearSlotProps) => (
  <IconButton
    type="button"
    size="1"
    variant="ghost"
    color="gray"
    style={{ marginInlineStart: "auto" }}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    <CrossCircledIcon />
  </IconButton>
);

/**
 * Radix indicator
 *
 * A `Spinner` while a first page is loading, the select's chevron otherwise.
 */
const RadixIndicator = ({ open, loading }: AutocompleteIndicatorSlotProps) => (
  <span aria-hidden="true" style={{ display: "inline-flex", marginInlineStart: "auto", color: "var(--gray-a11)" }}>
    {loading ? <Spinner size="1" /> : <ChevronDownIcon style={{ transform: open ? "rotate(180deg)" : undefined }} />}
  </span>
);

/**
 * Radix popup
 *
 * The solid panel of Radix's menus. The component positions it, so the part
 * only adds the surface to the style it receives. It is a column the list
 * fills, so the list scrolls inside the height it is given and the search
 * box stays put.
 */
const RadixPopup = ({ style, ...props }: AutocompletePopupSlotProps) => (
  <div
    style={{
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      overflow: "hidden",
      padding: "var(--space-1)",
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
);

/**
 * Radix search
 *
 * A `TextField` with a magnifying glass. `TextField.Root` hands the ref,
 * the `role`, the aria wiring and the key handler to its `<input>`. Its
 * `size` and `color` are variants rather than the HTML attributes, which is
 * why the slot's props leave them out. `TextField` also narrows two HTML
 * props: `value` must be a string or number, and `type` one of the text-like
 * types. The engine's query is always a string, so `value` is passed on as
 * one; a `type` from `slotProps.search` is passed on as given, since only a
 * text-like one makes sense for a search box; and `defaultValue`, which the
 * controlled input never reads, is dropped.
 */
const RadixSearch = ({ value, type, defaultValue: _defaultValue, ...props }: AutocompleteSearchSlotProps) => (
  <Box mb="1" flexShrink="0">
    <TextField.Root
      size="2"
      type={type as TextField.RootProps["type"]}
      value={value === undefined ? undefined : String(value)}
      {...props}
    >
      <TextField.Slot>
        <MagnifyingGlassIcon />
      </TextField.Slot>
    </TextField.Root>
  </Box>
);

/**
 * Radix trigger input
 *
 * A `TextField` that is the combobox when the search is in the trigger. The
 * field around it draws the border and the focus outline, so its own are
 * cleared; it hands the ref, the role, the aria wiring and the key handler
 * to its `<input>`, and narrows `value` and `type` as the search box does.
 */
const RadixTriggerInput = ({ value, type, defaultValue: _defaultValue, style, ...props }: AutocompleteTriggerInputSlotProps) => (
  <TextField.Root
    size="2"
    variant="soft"
    color="gray"
    type={type as TextField.RootProps["type"]}
    value={value === undefined ? undefined : String(value)}
    style={{ flex: "1 0 80px", minWidth: 80, background: "transparent", boxShadow: "none", outline: "none", ...style }}
    {...props}
  />
);

/**
 * Radix toggle
 *
 * A ghost `IconButton` holding the chevron, kept out of the tab order.
 */
const RadixToggle = (props: AutocompleteToggleSlotProps) => (
  <IconButton size="1" variant="ghost" color="gray" style={{ margin: 0 }} {...props} type="button" />
);

/**
 * Radix list
 *
 * The `<ul>` the listbox role goes on, and the part that scrolls.
 */
const RadixList = ({ style, ...props }: AutocompleteListSlotProps) => (
  <ul style={{ flex: 1, minHeight: 0, margin: 0, padding: 0, overflowY: "auto", listStyle: "none", ...style }} {...props} />
);

/**
 * Radix option
 *
 * A row of Radix's soft select menu: the accent tint on the highlighted row,
 * a lighter one and the medium weight on a selected row. Disabled rows stay
 * visible and only look unavailable: the engine is what refuses them.
 */
function RadixOption({ style, ...props }: AutocompleteOptionSlotProps) {
  const disabled = has(props, "data-disabled");
  const selected = has(props, "data-selected");
  const highlighted = has(props, "data-highlighted");
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        minHeight: "var(--space-6)",
        paddingInline: "var(--space-3)",
        borderRadius: "var(--radius-2)",
        color: disabled ? "var(--gray-a8)" : "var(--gray-12)",
        fontWeight: selected ? "var(--font-weight-medium)" : undefined,
        backgroundColor: highlighted && !disabled ? "var(--accent-a4)" : selected ? "var(--accent-a3)" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Radix group
 *
 * The group's own `<ul>`, carrying `role="group"`, inside a bare `<li>`.
 * Radix's `Select.Group` needs the select's context, so it cannot be used on
 * its own.
 */
const RadixGroup = ({ label: _label, labelId: _labelId, style, ...props }: AutocompleteGroupSlotProps) => (
  <li role="none">
    <ul style={{ margin: 0, padding: 0, listStyle: "none", ...style }} {...props} />
  </li>
);

/**
 * Radix group label
 *
 * The look of `Select.Label`: a row's height and padding in the muted gray,
 * at the small size.
 */
const RadixGroupLabel = ({ label, ...props }: AutocompleteGroupLabelSlotProps) => (
  <li
    style={{
      display: "flex",
      alignItems: "center",
      /* 28px, the virtual list's default groupLabelSize. */
      minHeight: "calc(var(--space-5) + var(--space-1))",
      paddingInline: "var(--space-3)",
      color: "var(--gray-a10)",
      cursor: "default",
      userSelect: "none",
    }}
    {...props}
  >
    <Text size="1">{label}</Text>
  </li>
);

/**
 * Radix separator
 *
 * Radix's `Separator` in a hidden list item, run out to the popup's edges.
 */
const RadixSeparator = ({ style, ...props }: AutocompleteSeparatorSlotProps) => (
  <li style={{ marginBlock: "var(--space-1)", marginInline: "calc(var(--space-1) * -1)", ...style }} {...props}>
    <Separator size="4" />
  </li>
);

/**
 * Radix option label
 *
 * The row's text, cut short rather than wrapped.
 */
const RadixOptionLabel = ({ label }: AutocompleteOptionLabelSlotProps) => (
  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{label}</span>
);

/**
 * Radix check
 *
 * The select's check mark on a selected row, hidden from assistive
 * technology so it stays out of the option's accessible name.
 */
const RadixCheck = ({ selected }: AutocompleteCheckSlotProps) =>
  selected ? (
    <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--accent-11)" }}>
      <CheckIcon />
    </span>
  ) : null;

/**
 * Radix status row
 *
 * The padded row the empty, loading and error states share.
 */
const RadixStatusRow = ({ children }: { children: ReactNode }) => (
  <Flex asChild align="center" gap="2" px="3" py="2">
    <li>{children}</li>
  </Flex>
);

/**
 * Radix empty state
 *
 * The message in muted text.
 */
const RadixEmpty = ({ message }: AutocompleteEmptySlotProps) => (
  <RadixStatusRow>
    <Text size="2" color="gray">
      {message}
    </Text>
  </RadixStatusRow>
);

/**
 * Radix loading state
 *
 * A `Spinner` beside the message.
 */
const RadixLoading = ({ message }: AutocompleteLoadingSlotProps) => (
  <RadixStatusRow>
    <Spinner size="1" />
    <Text size="2" color="gray">
      {message}
    </Text>
  </RadixStatusRow>
);

/**
 * Radix error state
 *
 * The message in red and a soft retry `Button`.
 */
const RadixError = ({ error, onRetry, retryLabel }: AutocompleteErrorSlotProps) => (
  <RadixStatusRow>
    <Text size="2" color="red">
      {error}
    </Text>
    {onRetry ? (
      <Button type="button" size="1" variant="soft" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </RadixStatusRow>
);

/**
 * Radix create row
 *
 * A full-width ghost `Button` offering to create whatever was searched for;
 * its `loading` swaps the label for a `Spinner`.
 */
const RadixCreate = ({ onCreate, loading, label }: AutocompleteCreateSlotProps) => (
  <li style={{ display: "flex", padding: "var(--space-1)" }}>
    <Button type="button" variant="ghost" loading={loading} onClick={onCreate} style={{ flex: 1, margin: 0, justifyContent: "flex-start" }}>
      {label}
    </Button>
  </li>
);

/**
 * Radix load-more row
 *
 * The paging sentinel, which is also a `Button` so the next page is
 * reachable without a pointer.
 */
const RadixLoadMore = ({ ref, onLoadMore, loading, label }: AutocompleteLoadMoreSlotProps) => (
  <li ref={ref} style={{ display: "flex", padding: "var(--space-1)" }}>
    <Button type="button" variant="ghost" color="gray" disabled={loading} onClick={onLoadMore} style={{ flex: 1, margin: 0 }}>
      {label}
    </Button>
  </li>
);

/**
 * Radix Themes components
 *
 * The slot map a Radix Themes v3 project would pass as `components`.
 */
export const radixAutocomplete: Partial<AutocompleteComponents> = {
  Root: RadixRoot,
  Trigger: RadixTrigger,
  TriggerInput: RadixTriggerInput,
  Toggle: RadixToggle,
  Value: RadixValue,
  Tag: RadixTag,
  Clear: RadixClear,
  Indicator: RadixIndicator,
  Popup: RadixPopup,
  Search: RadixSearch,
  List: RadixList,
  Option: RadixOption,
  OptionLabel: RadixOptionLabel,
  Check: RadixCheck,
  Group: RadixGroup,
  GroupLabel: RadixGroupLabel,
  Separator: RadixSeparator,
  Empty: RadixEmpty,
  Loading: RadixLoading,
  Error: RadixError,
  Create: RadixCreate,
  LoadMore: RadixLoadMore,
};
