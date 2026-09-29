/**
 * Autocomplete for shadcn/ui
 *
 * A `components` map that renders the slotsmith autocomplete with shadcn/ui
 * primitives, written for shadcn/ui on Tailwind CSS v4. Copy the file, keep
 * the parts you want, and pass the map as `components={shadcnAutocomplete}`;
 * every slot left out keeps its fallback.
 *
 * The `@/components/ui/*` and `@/lib/utils` imports are the app's own
 * shadcn/ui files.
 */
import type {
  AutocompleteCheckSlotProps,
  AutocompleteClearSlotProps,
  AutocompleteComponents,
  AutocompleteCreateSlotProps,
  AutocompleteEmptySlotProps,
  AutocompleteErrorSlotProps,
  AutocompleteIndicatorSlotProps,
  AutocompleteListSlotProps,
  AutocompleteLoadMoreSlotProps,
  AutocompleteLoadingSlotProps,
  AutocompleteOptionLabelSlotProps,
  AutocompleteOptionSlotProps,
  AutocompletePopupSlotProps,
  AutocompleteRootSlotProps,
  AutocompleteSearchSlotProps,
  AutocompleteTagSlotProps,
  AutocompleteTriggerSlotProps,
  AutocompleteValueSlotProps,
} from "slotsmith/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Stands in for `lucide-react`'s ChevronDown icon. */
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Stands in for `lucide-react`'s Check icon. */
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Stands in for `lucide-react`'s X icon. */
const X = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/** Stands in for `lucide-react`'s LoaderCircle icon. */
const Loader = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4 animate-spin"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/**
 * Shadcn root
 *
 * The positioning context the popup is measured against.
 */
const ShadcnRoot = ({ className, ...props }: AutocompleteRootSlotProps) => (
  <div className={cn("relative w-full", className)} {...props} />
);

/**
 * Shadcn trigger
 *
 * The `select-trigger` look, driven by the `data-*` attributes the part
 * carries rather than by props of its own.
 */
const ShadcnTrigger = ({ className, ...props }: AutocompleteTriggerSlotProps) => (
  <div
    data-slot="select-trigger"
    className={cn(
      "flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
      "data-[open]:border-ring data-[open]:ring-[3px] data-[open]:ring-ring/50",
      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn value
 *
 * The selected label, muted while it is the placeholder.
 */
const ShadcnValue = ({ label, placeholder, empty }: AutocompleteValueSlotProps) => (
  <span data-slot="select-value" className={cn("truncate", empty && "text-muted-foreground")}>
    {empty ? placeholder : label}
  </span>
);

/**
 * Shadcn tag
 *
 * A secondary `Badge` per selected value, with a real button for removing it.
 */
const ShadcnTag = ({ label, onRemove, removeLabel, disabled }: AutocompleteTagSlotProps) => (
  <Badge variant="secondary">
    {label}
    {!disabled && (
      <button
        type="button"
        aria-label={removeLabel}
        className="rounded-xs opacity-60 hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <X />
      </button>
    )}
  </Badge>
);

/**
 * Shadcn clear
 *
 * A ghost icon `Button`. The click is stopped so it does not also reach the
 * trigger and reopen the popup.
 *
 * shadcn's `Button` sets no `type`, so inside a form it would submit it;
 * this and every other `Button` here passes `type="button"`.
 */
const ShadcnClear = ({ onClick, ...aria }: AutocompleteClearSlotProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="ms-auto"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    <X />
  </Button>
);

/**
 * Shadcn indicator
 *
 * A spinner while a first page is loading, the chevron otherwise.
 */
const ShadcnIndicator = ({ open, loading }: AutocompleteIndicatorSlotProps) => (
  <span className={cn("ms-auto text-muted-foreground transition-transform", open && "rotate-180")}>
    {loading ? <Loader /> : <ChevronDown />}
  </span>
);

/**
 * Shadcn popup
 *
 * The `popover-content` surface. The component positions it, so the part only
 * receives the computed style and adds the look.
 */
const ShadcnPopup = ({ className, ...props }: AutocompletePopupSlotProps) => (
  <div
    data-slot="popover-content"
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn search
 *
 * The `command-input` row: an `Input` with the search icon beside it.
 */
const ShadcnSearch = ({ className, ...props }: AutocompleteSearchSlotProps) => (
  <div data-slot="command-input-wrapper" className="flex items-center border-b px-3">
    <Input className={cn("h-9 border-0 px-0 shadow-none focus-visible:ring-0", className)} {...props} />
  </div>
);

/**
 * Shadcn list
 *
 * The `command-list` scroll box, which is also the `<ul>` the listbox role
 * goes on.
 */
const ShadcnList = ({ className, ...props }: AutocompleteListSlotProps) => (
  <ul data-slot="command-list" className={cn("max-h-full overflow-x-hidden overflow-y-auto p-1", className)} {...props} />
);

/**
 * Shadcn option
 *
 * The `command-item` row. Disabled rows stay visible and only look
 * unavailable: the engine is what refuses them.
 */
const ShadcnOption = ({ className, ...props }: AutocompleteOptionSlotProps) => (
  <li
    data-slot="command-item"
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
      "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
      "data-[disabled]:pointer-events-auto data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn option label
 *
 * The row's text.
 */
const ShadcnOptionLabel = ({ label }: AutocompleteOptionLabelSlotProps) => <span className="truncate">{label}</span>;

/**
 * Shadcn check
 *
 * The mark on a selected row. The icon is hidden from assistive technology, so
 * it stays out of the option's accessible name.
 */
const ShadcnCheck = ({ selected }: AutocompleteCheckSlotProps) =>
  selected ? (
    <span className="ms-auto text-primary">
      <Check />
    </span>
  ) : null;

/**
 * Shadcn empty state
 *
 * The `command-empty` row.
 */
const ShadcnEmpty = ({ message }: AutocompleteEmptySlotProps) => (
  <li data-slot="command-empty" className="py-6 text-center text-sm text-muted-foreground">
    {message}
  </li>
);

/**
 * Shadcn loading state
 *
 * A spinner beside the message.
 */
const ShadcnLoading = ({ message }: AutocompleteLoadingSlotProps) => (
  <li data-slot="command-loading" className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
    <Loader />
    {message}
  </li>
);

/**
 * Shadcn error state
 *
 * The message in the destructive color and a retry `Button`.
 */
const ShadcnError = ({ error, onRetry, retryLabel }: AutocompleteErrorSlotProps) => (
  <li data-slot="command-error" className="flex items-center gap-2 px-2 py-3 text-sm">
    <span className="text-destructive">{error}</span>
    {onRetry ? (
      <Button type="button" variant="outline" size="sm" className="ms-auto" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </li>
);

/**
 * Shadcn create row
 *
 * A full-width ghost `Button` offering to create whatever was searched for.
 */
const ShadcnCreate = ({ onCreate, loading, label }: AutocompleteCreateSlotProps) => (
  <li data-slot="command-create">
    <Button type="button" variant="ghost" size="sm" className="w-full justify-start" disabled={loading} onClick={onCreate}>
      {label}
    </Button>
  </li>
);

/**
 * Shadcn load-more row
 *
 * The paging sentinel, which is also a `Button` so the next page is reachable
 * without a pointer.
 */
const ShadcnLoadMore = ({ ref, onLoadMore, loading, label }: AutocompleteLoadMoreSlotProps) => (
  <li ref={ref} data-slot="command-more">
    <Button type="button" variant="ghost" size="sm" className="w-full" disabled={loading} onClick={onLoadMore}>
      {label}
    </Button>
  </li>
);

/**
 * Shadcn components
 *
 * The slot map a shadcn/ui project would pass as `components`: its own
 * primitives where it has them, and the popover and command class sets for
 * the parts it styles by hand.
 */
export const shadcnAutocomplete: Partial<AutocompleteComponents> = {
  Root: ShadcnRoot,
  Trigger: ShadcnTrigger,
  Value: ShadcnValue,
  Tag: ShadcnTag,
  Clear: ShadcnClear,
  Indicator: ShadcnIndicator,
  Popup: ShadcnPopup,
  Search: ShadcnSearch,
  List: ShadcnList,
  Option: ShadcnOption,
  OptionLabel: ShadcnOptionLabel,
  Check: ShadcnCheck,
  Empty: ShadcnEmpty,
  Loading: ShadcnLoading,
  Error: ShadcnError,
  Create: ShadcnCreate,
  LoadMore: ShadcnLoadMore,
};
