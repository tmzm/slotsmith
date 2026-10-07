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
import { useAutocompleteContext } from "slotsmith/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
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
 * carries rather than by props of its own. An invalid value gets shadcn's
 * own `aria-invalid:` treatment: the destructive border, and the destructive
 * ring while open or focused.
 *
 * With the search in the trigger it is an `InputGroup` instead: the group
 * draws the field, its ring and its destructive state off the input inside,
 * and grows to wrap the badges.
 */
function ShadcnTrigger({ className, ...props }: AutocompleteTriggerSlotProps) {
  if ("data-search-in" in props) {
    return (
      <InputGroup
        className={cn(
          "h-auto min-h-9 cursor-text gap-1 py-0.5 ps-1",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      />
    );
  }
  return (
    <div
      data-slot="select-trigger"
      className={cn(
        "flex min-h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none",
        "data-[open]:border-ring data-[open]:ring-[3px] data-[open]:ring-ring/50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "aria-invalid:border-destructive",
        "aria-invalid:data-[open]:border-destructive aria-invalid:data-[open]:ring-destructive/20 dark:aria-invalid:data-[open]:ring-destructive/40",
        "aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20 dark:aria-invalid:focus-visible:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Shadcn trigger input
 *
 * The `InputGroupInput` that is the combobox when the search is in the
 * trigger. It takes the space the badges leave and wraps below them when
 * that is too little.
 */
const ShadcnTriggerInput = ({ className, ...props }: AutocompleteTriggerInputSlotProps) => (
  <InputGroupInput className={cn("h-7 min-w-20 basis-20 px-2", className)} {...props} />
);

/**
 * Shadcn toggle
 *
 * An icon `InputGroupButton` in an inline-end `InputGroupAddon`, holding the
 * chevron. It stays out of the tab order and never takes focus from the
 * input.
 */
const ShadcnToggle = ({ className, ...props }: AutocompleteToggleSlotProps) => (
  <InputGroupAddon align="inline-end" className="ps-0">
    <InputGroupButton size="icon-xs" className={cn("text-muted-foreground", className)} {...props} />
  </InputGroupAddon>
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
 *
 * With the search in the trigger it is an icon `InputGroupButton` in an
 * inline-end `InputGroupAddon`, beside the toggle.
 */
function ShadcnClear({ onClick, ...aria }: AutocompleteClearSlotProps) {
  const { searchIn } = useAutocompleteContext();
  if (searchIn === "trigger") {
    return (
      <InputGroupAddon align="inline-end" className="pe-0">
        <InputGroupButton size="icon-xs" onClick={onClick} {...aria}>
          <X />
        </InputGroupButton>
      </InputGroupAddon>
    );
  }
  return (
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
}

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
 * Shadcn group
 *
 * The `command-group`: its own `<ul>`, carrying `role="group"`, inside a
 * bare `<li>`.
 */
const ShadcnGroup = ({ label: _label, labelId: _labelId, className, ...props }: AutocompleteGroupSlotProps) => (
  <li role="none">
    <ul data-slot="command-group" className={cn("overflow-hidden text-foreground", className)} {...props} />
  </li>
);

/**
 * Shadcn group label
 *
 * The `command-group` heading, with the combobox's label classes.
 */
const ShadcnGroupLabel = ({ label, ...props }: AutocompleteGroupLabelSlotProps) => (
  <li data-slot="command-group-heading" className="text-muted-foreground px-2 py-1.5 text-xs font-medium" {...props}>
    {label}
  </li>
);

/**
 * Shadcn separator
 *
 * The `Separator` in a hidden list item, run out to the list's edges like
 * the `command-separator`.
 */
const ShadcnSeparator = ({ className, ...props }: AutocompleteSeparatorSlotProps) => (
  <li className={cn("-mx-1 my-1", className)} {...props}>
    <Separator />
  </li>
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
  TriggerInput: ShadcnTriggerInput,
  Toggle: ShadcnToggle,
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
  Group: ShadcnGroup,
  GroupLabel: ShadcnGroupLabel,
  Separator: ShadcnSeparator,
  Empty: ShadcnEmpty,
  Loading: ShadcnLoading,
  Error: ShadcnError,
  Create: ShadcnCreate,
  LoadMore: ShadcnLoadMore,
};
