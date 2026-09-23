import type {
  ComponentType,
  HTMLAttributes,
  InputHTMLAttributes,
  LiHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import type { AutocompleteStatus, OptionValue } from "../core/types";

/**
 * DOM props
 *
 * The attributes an element part receives.
 *
 * `color` and `size` are removed because component libraries reuse those
 * attribute names for their own semantic props — passing an HTML `size` to
 * MUI's `InputBase` or Chakra's `Input` is a type error and a runtime
 * surprise. The data table drops `align` from its cell parts for the same
 * reason.
 *
 * @typeParam E - The element type.
 */
type DomProps<E extends HTMLElement> = Omit<HTMLAttributes<E>, "color">;

/**
 * Root slot props
 *
 * The element the popup is positioned against. Carries `data-open`,
 * `data-disabled` and `data-empty`.
 */
export interface AutocompleteRootSlotProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Trigger slot props
 *
 * The control that opens the list. It carries `role="combobox"` and is a
 * `<div>` rather than a `<button>`, because the tag and clear controls inside
 * it are buttons and HTML forbids nesting them.
 */
export interface AutocompleteTriggerSlotProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Popup slot props
 *
 * The floating surface holding the search box and the list. Replace it to use
 * a library's own popover, in which case its positioning replaces the
 * built-in one.
 */
export interface AutocompletePopupSlotProps extends DomProps<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Search slot props
 *
 * The search box. Plain input attributes, plus the ref that is focused when
 * the popup opens.
 */
export interface AutocompleteSearchSlotProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "color" | "size"> {
  ref?: Ref<HTMLInputElement>;
}

/**
 * List slot props
 *
 * The `role="listbox"` element. It is also the scroll box that paging and the
 * highlight measure against.
 */
export interface AutocompleteListSlotProps extends DomProps<HTMLUListElement> {
  ref?: Ref<HTMLUListElement>;
}

/**
 * Option slot props
 *
 * One `role="option"` row. Carries `data-highlighted`, `data-selected`,
 * `data-disabled` and `data-index`.
 */
export interface AutocompleteOptionSlotProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, "color"> {
  ref?: Ref<HTMLLIElement>;
}

/**
 * Value slot props
 *
 * What the trigger shows: the selected label, or the placeholder.
 */
export interface AutocompleteValueSlotProps {
  /** The selected option's text, when there is one. */
  label?: string;
  /** Shown when nothing is selected. */
  placeholder: string;
  /** Whether anything is selected. */
  empty: boolean;
}

/**
 * Tag slot props
 *
 * One selected value shown on the trigger in multiple mode.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteTagSlotProps<TOption = unknown> {
  /** The option's text, falling back to its id when the option is unknown. */
  label: string;
  /** The id this tag stands for. */
  value: OptionValue;
  /** The option behind it, when it is known. */
  option?: TOption;
  /** Removes just this value. */
  onRemove: () => void;
  /** Accessible name for the remove control. */
  removeLabel: string;
  /** Whether the control is disabled. */
  disabled: boolean;
}

/**
 * Clear slot props
 *
 * The control that empties the selection. Render a real button: it must be
 * reachable by keyboard.
 */
export interface AutocompleteClearSlotProps {
  /** Clears the selection. */
  onClick: () => void;
  /** Accessible name. */
  "aria-label": string;
}

/**
 * Indicator slot props
 *
 * The chevron, or a spinner while options are loading.
 */
export interface AutocompleteIndicatorSlotProps {
  /** Whether the popup is open. */
  open: boolean;
  /** Whether a first page is in flight. */
  loading: boolean;
}

/**
 * Option label slot props
 *
 * The content of an option row. This is where rich rows belong: the `Option`
 * part is an element part and only receives DOM props, so the option object
 * is handed to this part instead.
 *
 * @typeParam TOption - The option type.
 */
export interface AutocompleteOptionLabelSlotProps<TOption = unknown> {
  /** The whole option. */
  option: TOption;
  /** Its text, as `getOptionLabel` returned it. */
  label: string;
  /** Whether it is selected. */
  selected: boolean;
  /** Whether it is the active option. */
  highlighted: boolean;
  /** Whether it can be picked. */
  disabled: boolean;
}

/**
 * Check slot props
 *
 * The mark on a selected option.
 */
export interface AutocompleteCheckSlotProps {
  /** Whether to render as selected. */
  selected: boolean;
}

/**
 * Empty slot props
 *
 * Shown when the list has nothing to render.
 */
export interface AutocompleteEmptySlotProps {
  /** The current search text. */
  query: string;
  /** Why the list is empty. Either `empty` or `min-chars`. */
  status: AutocompleteStatus;
  /** The message for that reason. */
  message: string;
}

/**
 * Loading slot props
 *
 * Shown while a first page is in flight and there is nothing to show yet.
 */
export interface AutocompleteLoadingSlotProps {
  /** The message. */
  message: string;
}

/**
 * Error slot props
 *
 * Shown when the last fetch failed. It replaces the list, so a failure never
 * reads as "no results".
 */
export interface AutocompleteErrorSlotProps {
  /** The message. */
  error: string;
  /** Retries, when the caller provided a way to. */
  onRetry?: () => void;
  /** Label for the retry control. */
  retryLabel: string;
}

/**
 * Create slot props
 *
 * The row offering to create whatever was searched for. Replace it to ask for
 * more than a name — a colour, a category — without leaving the picker.
 */
export interface AutocompleteCreateSlotProps {
  /** The text that would be created. */
  query: string;
  /** Creates it. */
  onCreate: () => void;
  /** Whether the create request is in flight. */
  loading: boolean;
  /** The rendered label, e.g. `Create "Acme"`. */
  label: string;
}

/**
 * Load more slot props
 *
 * The last row of a paged list. It is observed, so scrolling it into view
 * requests the next page, and it is also a button, because an observer alone
 * strands anyone not using a mouse.
 */
export interface AutocompleteLoadMoreSlotProps {
  /** Attach to the element that should be observed. */
  ref?: Ref<HTMLLIElement>;
  /** Requests the next page. */
  onLoadMore: () => void;
  /** Whether that page is already in flight. */
  loading: boolean;
  /** The label for the current state. */
  label: string;
}

/**
 * Autocomplete components
 *
 * Every replaceable part.
 *
 * Element parts — `Root`, `Trigger`, `Popup`, `Search`, `List`, `Option` —
 * receive DOM props with state as `data-*`, so a library's primitives drop
 * straight in. Widget parts receive semantic props and usually need a short
 * adapter.
 *
 * @typeParam TOption - The option type.
 *
 * @example
 * ```tsx
 * const mui: Partial<AutocompleteComponents> = {
 *   Popup: (props) => <Paper elevation={8} {...props} />,
 *   Option: (props) => <MenuItem component="li" {...props} />,
 *   Check: ({ selected }) => (selected ? <CheckIcon color="primary" /> : null),
 * };
 * ```
 */
export interface AutocompleteComponents<TOption = any> {
  Root: ComponentType<AutocompleteRootSlotProps>;
  Trigger: ComponentType<AutocompleteTriggerSlotProps>;
  Value: ComponentType<AutocompleteValueSlotProps>;
  Tag: ComponentType<AutocompleteTagSlotProps<TOption>>;
  Clear: ComponentType<AutocompleteClearSlotProps>;
  Indicator: ComponentType<AutocompleteIndicatorSlotProps>;
  Popup: ComponentType<AutocompletePopupSlotProps>;
  Search: ComponentType<AutocompleteSearchSlotProps>;
  List: ComponentType<AutocompleteListSlotProps>;
  Option: ComponentType<AutocompleteOptionSlotProps>;
  OptionLabel: ComponentType<AutocompleteOptionLabelSlotProps<TOption>>;
  Check: ComponentType<AutocompleteCheckSlotProps>;
  Empty: ComponentType<AutocompleteEmptySlotProps>;
  Loading: ComponentType<AutocompleteLoadingSlotProps>;
  Error: ComponentType<AutocompleteErrorSlotProps>;
  Create: ComponentType<AutocompleteCreateSlotProps>;
  LoadMore: ComponentType<AutocompleteLoadMoreSlotProps>;
}

/**
 * Autocomplete slot props
 *
 * Extra DOM props for the element parts, merged with the ones the component
 * sets itself.
 */
export interface AutocompleteSlotProps {
  root?: AutocompleteRootSlotProps;
  trigger?: AutocompleteTriggerSlotProps;
  popup?: AutocompletePopupSlotProps;
  search?: AutocompleteSearchSlotProps;
  list?: AutocompleteListSlotProps;
  /** Per-option props, e.g. a className that depends on the option. */
  option?: (option: any, index: number) => AutocompleteOptionSlotProps;
}

/**
 * Autocomplete labels
 *
 * Every user-facing string, so translating is a prop rather than a fork.
 */
export interface AutocompleteLabels {
  /** Trigger text when nothing is selected. */
  placeholder: string;
  /** Placeholder for the search box. */
  search: string;
  /** Accessible name for the clear control. */
  clear: string;
  /** Accessible name for a tag's remove control. */
  remove: (label: string) => string;
  /** Shown when a search returned nothing. */
  empty: string;
  /** Shown while a first page is loading. */
  loading: string;
  /** Shown before `minChars` characters have been typed. */
  minChars: (count: number) => string;
  /** Label for the retry control. */
  retry: string;
  /** Label for the create row. */
  create: (query: string) => string;
  /** Label for the create row while the request is in flight. */
  creating: string;
  /** The overflow badge in multiple mode. */
  more: (count: number) => string;
  /** Label for the load-more control. */
  loadMore: string;
  /** Announced to screen readers when the result count changes. */
  results: (count: number) => string;
}

/**
 * Children
 *
 * Re-exported so slot authors do not need a separate React import.
 */
export type { ReactNode };
