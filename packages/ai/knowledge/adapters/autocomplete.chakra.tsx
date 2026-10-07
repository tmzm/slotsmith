/**
 * Autocomplete for Chakra UI
 *
 * A `components` map that renders the slotsmith autocomplete with Chakra UI
 * primitives, tested against Chakra UI v3. Copy the file, keep the parts you
 * want, and pass the map as `components={chakraAutocomplete}`; every slot left
 * out keeps its fallback.
 */
import { Box, Button, EmptyState, IconButton, Input, List, Separator, Span, Spinner, Tag, Text } from "@chakra-ui/react";
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
 * Chakra root
 *
 * The `Box` the popup is measured against.
 */
const ChakraRoot = (props: AutocompleteRootSlotProps) => <Box position="relative" {...props} />;

/**
 * Chakra trigger
 *
 * A bordered `Box`, styled off the `data-*` attributes the part carries. An
 * invalid value takes Chakra's `_invalid` condition and its `border.error`
 * token, the way Chakra's own `Input` shows one.
 *
 * With the search in the trigger it is the field around the `Input`: it
 * wraps the tags, and takes Chakra's focus ring while the input inside has
 * focus, through `_focusWithin`. The error border follows `data-invalid`,
 * since `aria-invalid` is on the input then.
 */
const ChakraTrigger = (props: AutocompleteTriggerSlotProps) => (
  <Box
    display="flex"
    alignItems="center"
    gap="2"
    minH="10"
    px="3"
    borderWidth="1px"
    borderRadius="md"
    cursor="pointer"
    css={{
      "&[data-open]": { borderColor: "colorPalette.solid" },
      "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
      _invalid: { borderColor: "border.error" },
      "&[data-search-in]": { flexWrap: "wrap", gap: "1", px: "1", py: "0.5", cursor: "text" },
      "&[data-search-in]:focus-within": { borderColor: "colorPalette.focusRing", outline: "1px solid", outlineColor: "colorPalette.focusRing" },
      "&[data-search-in][data-invalid]": { borderColor: "border.error" },
      "&[data-search-in][data-invalid]:focus-within": { outlineColor: "border.error" },
    }}
    {...props}
  />
);

/**
 * Chakra trigger input
 *
 * Chakra's `Input`, unstyled, since the field around it draws the border.
 * It is the combobox when the search is in the trigger, and takes the space
 * the tags leave.
 */
const ChakraTriggerInput = (props: AutocompleteTriggerInputSlotProps) => (
  <Input unstyled flex="1 0 80px" minW="20" h="8" px="2" bg="transparent" outline="none" {...props} />
);

/**
 * Chakra toggle
 *
 * A ghost `IconButton` holding the chevron, kept out of the tab order.
 */
const ChakraToggle = (props: AutocompleteToggleSlotProps) => <IconButton size="xs" variant="ghost" {...props} />;

/**
 * Chakra value
 *
 * The selected label, or the placeholder in the muted foreground.
 */
const ChakraValue = ({ label, placeholder, empty }: AutocompleteValueSlotProps) => (
  <Text as="span" color={empty ? "fg.muted" : "fg"}>
    {empty ? placeholder : label}
  </Text>
);

/**
 * Chakra tag
 *
 * `Tag.Root` with Chakra's own close trigger, which already renders a button
 * and its icon; the accessible name is the only thing it needs.
 */
const ChakraTag = ({ label, onRemove, removeLabel, disabled }: AutocompleteTagSlotProps) => (
  <Tag.Root size="md" variant="subtle">
    <Tag.Label>{label}</Tag.Label>
    {!disabled && (
      <Tag.CloseTrigger
        aria-label={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      />
    )}
  </Tag.Root>
);

/**
 * Chakra clear
 *
 * An `IconButton` that empties the selection. The click is stopped so it does
 * not also reach the trigger and reopen the popup.
 */
const ChakraClear = ({ onClick, ...aria }: AutocompleteClearSlotProps) => (
  <IconButton
    size="xs"
    variant="ghost"
    ms="auto"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    ✕
  </IconButton>
);

/**
 * Chakra indicator
 *
 * A `Spinner` while a first page is loading, a chevron otherwise.
 */
const ChakraIndicator = ({ open, loading }: AutocompleteIndicatorSlotProps) =>
  loading ? (
    <Spinner size="xs" ms="auto" />
  ) : (
    <Span aria-hidden="true" ms="auto" color="fg.muted" transform={open ? "rotate(180deg)" : undefined}>
      ▾
    </Span>
  );

/**
 * Chakra popup
 *
 * A panel `Box`. The component positions it, so the part only receives the
 * computed style and adds the surface.
 */
const ChakraPopup = (props: AutocompletePopupSlotProps) => (
  <Box bg="bg.panel" borderWidth="1px" borderRadius="md" boxShadow="md" overflow="auto" zIndex="dropdown" {...props} />
);

/**
 * Chakra search
 *
 * Chakra's `Input`. Its `size` is a recipe prop rather than the HTML
 * attribute, which is why the slot's props leave `size` out.
 */
const ChakraSearch = (props: AutocompleteSearchSlotProps) => (
  <Input size="sm" borderWidth="0" borderBottomWidth="1px" borderRadius="0" {...props} />
);

/**
 * Chakra list
 *
 * `List.Root` renders the `<ul>` the listbox role goes on.
 */
const ChakraList = (props: AutocompleteListSlotProps) => (
  <List.Root listStyleType="none" gap="0" p="1" m="0" maxH="100%" overflowY="auto" {...props} />
);

/**
 * Chakra option
 *
 * `List.Item`, styled off the row's `data-*` attributes. Disabled rows stay
 * visible and only look unavailable: the engine is what refuses them.
 */
const ChakraOption = (props: AutocompleteOptionSlotProps) => (
  <List.Item
    display="flex"
    alignItems="center"
    gap="2"
    px="3"
    py="1.5"
    borderRadius="sm"
    cursor="pointer"
    css={{
      "&[data-highlighted]": { background: "bg.emphasized" },
      "&[data-selected]": { fontWeight: "medium" },
      "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
    }}
    {...props}
  />
);

/**
 * Chakra option label
 *
 * The row's text.
 */
const ChakraOptionLabel = ({ label }: AutocompleteOptionLabelSlotProps) => <Span>{label}</Span>;

/**
 * Chakra group
 *
 * A nested `List.Root` carrying `role="group"`, inside a bare `List.Item`.
 * Chakra's combobox `ItemGroup` needs its own machine's context, so it cannot
 * be used on its own.
 */
const ChakraGroup = ({ label: _label, labelId: _labelId, ...props }: AutocompleteGroupSlotProps) => (
  <List.Item role="none">
    <List.Root listStyleType="none" gap="0" p="0" m="0" {...props} />
  </List.Item>
);

/**
 * Chakra group label
 *
 * The look of the combobox recipe's `itemGroupLabel`: medium weight, the
 * rows' padding, in the muted foreground at the small text style.
 */
const ChakraGroupLabel = ({ label, ...props }: AutocompleteGroupLabelSlotProps) => (
  <List.Item px="3" py="1.5" textStyle="xs" fontWeight="medium" color="fg.muted" cursor="default" {...props}>
    {label}
  </List.Item>
);

/**
 * Chakra separator
 *
 * Chakra's `Separator` in a hidden list item, run out to the list's edges.
 */
const ChakraSeparator = (props: AutocompleteSeparatorSlotProps) => (
  <List.Item my="1" mx="-1" {...props}>
    <Separator />
  </List.Item>
);

/**
 * Chakra check
 *
 * The mark on a selected row, hidden from assistive technology so it stays
 * out of the option's accessible name.
 */
const ChakraCheck = ({ selected }: AutocompleteCheckSlotProps) =>
  selected ? (
    <Span aria-hidden="true" ms="auto" color="colorPalette.fg">
      ✓
    </Span>
  ) : null;

/**
 * Chakra empty state
 *
 * Chakra's `EmptyState` block in place of the rows.
 */
const ChakraEmpty = ({ message }: AutocompleteEmptySlotProps) => (
  <List.Item listStyleType="none">
    <EmptyState.Root size="sm">
      <EmptyState.Content>
        <EmptyState.Title>{message}</EmptyState.Title>
      </EmptyState.Content>
    </EmptyState.Root>
  </List.Item>
);

/**
 * Chakra loading state
 *
 * A `Spinner` beside the message.
 */
const ChakraLoading = ({ message }: AutocompleteLoadingSlotProps) => (
  <List.Item display="flex" alignItems="center" gap="2" px="3" py="2" listStyleType="none">
    <Spinner size="xs" />
    <Text as="span" color="fg.muted">
      {message}
    </Text>
  </List.Item>
);

/**
 * Chakra error state
 *
 * The message in the error foreground and a retry `Button`.
 */
const ChakraError = ({ error, onRetry, retryLabel }: AutocompleteErrorSlotProps) => (
  <List.Item display="flex" alignItems="center" gap="2" px="3" py="2" listStyleType="none">
    <Text as="span" color="fg.error">
      {error}
    </Text>
    {onRetry ? (
      <Button size="xs" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </List.Item>
);

/**
 * Chakra create row
 *
 * A full-width `Button` offering to create whatever was searched for.
 */
const ChakraCreate = ({ onCreate, loading, label }: AutocompleteCreateSlotProps) => (
  <List.Item listStyleType="none">
    <Button size="xs" variant="ghost" width="full" disabled={loading} onClick={onCreate}>
      {label}
    </Button>
  </List.Item>
);

/**
 * Chakra load-more row
 *
 * The paging sentinel, which is also a `Button` so the next page is reachable
 * without a pointer.
 */
const ChakraLoadMore = ({ ref, onLoadMore, loading, label }: AutocompleteLoadMoreSlotProps) => (
  <List.Item ref={ref} listStyleType="none">
    <Button size="xs" variant="ghost" width="full" disabled={loading} onClick={onLoadMore}>
      {label}
    </Button>
  </List.Item>
);

/**
 * Chakra components
 *
 * The slot map a Chakra UI v3 project would pass as `components`.
 */
export const chakraAutocomplete: Partial<AutocompleteComponents> = {
  Root: ChakraRoot,
  Trigger: ChakraTrigger,
  TriggerInput: ChakraTriggerInput,
  Toggle: ChakraToggle,
  Value: ChakraValue,
  Tag: ChakraTag,
  Clear: ChakraClear,
  Indicator: ChakraIndicator,
  Popup: ChakraPopup,
  Search: ChakraSearch,
  List: ChakraList,
  Option: ChakraOption,
  OptionLabel: ChakraOptionLabel,
  Check: ChakraCheck,
  Group: ChakraGroup,
  GroupLabel: ChakraGroupLabel,
  Separator: ChakraSeparator,
  Empty: ChakraEmpty,
  Loading: ChakraLoading,
  Error: ChakraError,
  Create: ChakraCreate,
  LoadMore: ChakraLoadMore,
};
