/**
 * Autocomplete for MUI
 *
 * A `components` map that renders the slotsmith autocomplete with MUI
 * primitives, tested against MUI v7. Copy the file, keep the parts you want,
 * and pass the map as `components={muiAutocomplete}`; every slot left out
 * keeps its fallback.
 */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
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
 * Is true
 *
 * Whether an `aria-*` value means true: the boolean, or the string `"true"`
 * a consumer may pass through the slot props.
 *
 * @param value - The attribute's value.
 * @returns Whether it is set to true.
 */
const isTrue = (value: unknown) => value === true || value === "true";

/**
 * MUI root
 *
 * A `Box` the popup is measured against.
 */
const MuiRoot = (props: AutocompleteRootSlotProps) => <Box sx={{ position: "relative" }} {...props} />;

/**
 * MUI trigger
 *
 * An outlined `Box`, styled off the `data-*` attributes the part carries
 * rather than off props, so it stays a plain element part. `Box` reads `color`
 * as a system prop, which is why the slot's props leave the DOM attribute of
 * that name out.
 *
 * An invalid value takes the theme's `error` colour and MUI's `Mui-error`
 * state class, the way an outlined `TextField` with `error` shows one.
 *
 * With the search in the trigger it is the outlined field around the
 * `InputBase`: the primary border while the input has focus, read off
 * `:focus-within`, and the error border off `data-invalid`, since
 * `aria-invalid` is on the input then.
 */
const MuiTrigger = ({ className, ...props }: AutocompleteTriggerSlotProps) => {
  /** The part always passes the `data-invalid` key, so its value is what counts. */
  const invalid = isTrue(props["aria-invalid"]) || (props as Record<string, unknown>)["data-invalid"] !== undefined;
  return (
    <Box
      className={[className, invalid ? "Mui-error" : undefined].filter(Boolean).join(" ") || undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minHeight: 40,
        px: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        cursor: "pointer",
        "&[data-open]": { borderColor: "primary.main" },
        "&[data-disabled]": { opacity: 0.5, cursor: "default" },
        "&[data-search-in]": { flexWrap: "wrap", py: 0.5, cursor: "text" },
        "&[data-search-in]:focus-within": { borderColor: "primary.main", boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}` },
        "&.Mui-error": { borderColor: "error.main" },
        "&.Mui-error[data-search-in]:focus-within": { boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.error.main}` },
      }}
      {...props}
    />
  );
};

/**
 * MUI trigger input
 *
 * The `InputBase` that is the combobox when the search is in the trigger.
 * As with the search box, everything that belongs on the input element
 * itself goes through `inputProps`; `error` follows its `aria-invalid`.
 */
const MuiTriggerInput = ({ ref, value, onChange, placeholder, disabled, ...input }: AutocompleteTriggerInputSlotProps) => (
  <InputBase
    size="small"
    inputRef={ref}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    error={input["aria-invalid"] === true}
    inputProps={input}
    sx={{ flex: "1 0 80px", minWidth: 80, px: 0.5 }}
  />
);

/**
 * MUI toggle
 *
 * A small `IconButton` holding the chevron, kept out of the tab order.
 */
const MuiToggle = (props: AutocompleteToggleSlotProps) => <IconButton size="small" {...props} />;

/**
 * MUI value
 *
 * The selected label, or the placeholder in the disabled text color.
 */
const MuiValue = ({ label, placeholder, empty }: AutocompleteValueSlotProps) => (
  <Typography component="span" variant="body2" color={empty ? "text.disabled" : "text.primary"} noWrap>
    {empty ? placeholder : label}
  </Typography>
);

/**
 * MUI tag
 *
 * A `Chip` per selected value. `Chip` clones its `deleteIcon` and attaches its
 * own click handler to it, so the icon is an `IconButton` carrying the
 * accessible name: the remove control has to be reachable by keyboard.
 */
const MuiTag = ({ label, onRemove, removeLabel, disabled }: AutocompleteTagSlotProps) => (
  <Chip
    component="span"
    size="small"
    label={label}
    onDelete={disabled ? undefined : onRemove}
    deleteIcon={
      <IconButton size="small" aria-label={removeLabel}>
        ×
      </IconButton>
    }
  />
);

/**
 * MUI clear
 *
 * An `IconButton` that empties the selection. The click is stopped so it does
 * not also reach the trigger and reopen the popup.
 */
const MuiClear = ({ onClick, ...aria }: AutocompleteClearSlotProps) => (
  <IconButton
    size="small"
    sx={{ ml: "auto" }}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    ×
  </IconButton>
);

/**
 * MUI indicator
 *
 * A `CircularProgress` while a first page is loading, a chevron otherwise.
 */
const MuiIndicator = ({ open, loading }: AutocompleteIndicatorSlotProps) =>
  loading ? (
    <CircularProgress size={16} sx={{ ml: "auto" }} />
  ) : (
    <Box
      component="span"
      aria-hidden="true"
      sx={{ ml: "auto", color: "text.secondary", transform: open ? "rotate(180deg)" : "none" }}
    >
      ▾
    </Box>
  );

/**
 * MUI popup
 *
 * A raised `Paper`. The component positions it, so the part only receives the
 * computed style and adds the surface.
 */
const MuiPopup = (props: AutocompletePopupSlotProps) => (
  <Paper elevation={8} sx={{ overflow: "auto" }} {...props} />
);

/**
 * MUI search
 *
 * `InputBase` renders a wrapper around its input, so everything that belongs
 * on the input element itself is handed over through `inputProps` — including
 * the `role`, the aria wiring and the key handler the engine sets. Its `size`
 * is a variant rather than the HTML attribute, which is why the slot's props
 * leave `size` out.
 */
const MuiSearch = ({ ref, value, onChange, placeholder, ...input }: AutocompleteSearchSlotProps) => (
  <InputBase
    fullWidth
    size="small"
    inputRef={ref}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    inputProps={input}
    sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: "divider" }}
  />
);

/**
 * MUI list
 *
 * A dense `List`, which renders the `<ul>` the listbox role goes on.
 */
const MuiList = (props: AutocompleteListSlotProps) => <List dense disablePadding {...props} />;

/**
 * MUI option
 *
 * A `MenuItem`, with the part's `data-selected` mapped onto MUI's `selected`
 * prop so the row gets `Mui-selected` styling. Disabled options keep MUI's
 * `disabled` prop off on purpose: the engine already refuses them, and the
 * row has to stay visible and hoverable.
 */
const MuiOption = (props: AutocompleteOptionSlotProps) => (
  <MenuItem
    dense
    selected={props["data-selected" as keyof AutocompleteOptionSlotProps] === true}
    {...props}
  />
);

/**
 * MUI option label
 *
 * The row's text.
 */
const MuiOptionLabel = ({ label }: AutocompleteOptionLabelSlotProps) => (
  <Typography component="span" variant="body2" noWrap>
    {label}
  </Typography>
);

/**
 * MUI check
 *
 * The mark on a selected row, hidden from assistive technology so it stays
 * out of the option's accessible name.
 */
const MuiCheck = ({ selected }: AutocompleteCheckSlotProps) =>
  selected ? (
    <Box component="span" aria-hidden="true" sx={{ ml: "auto", color: "primary.main" }}>
      ✓
    </Box>
  ) : null;

/**
 * MUI group
 *
 * MUI's grouped-list shape: a bare `<li>` holding the group's own `<ul>`,
 * which carries `role="group"` and the label wiring.
 */
const MuiGroup = ({ label: _label, labelId: _labelId, ...props }: AutocompleteGroupSlotProps) => (
  <li role="none">
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }} {...props} />
  </li>
);

/**
 * MUI group label
 *
 * A `ListSubheader`, compacted to sit above dense rows at 28px, the virtual
 * list's default `groupLabelSize`. It is not sticky, so it never covers the
 * row the keyboard scrolls to.
 */
const MuiGroupLabel = ({ label, ...props }: AutocompleteGroupLabelSlotProps) => (
  <ListSubheader component="li" disableSticky sx={{ lineHeight: "28px", fontSize: "0.75rem" }} {...props}>
    {label}
  </ListSubheader>
);

/**
 * MUI separator
 *
 * A `Divider` rendered as the list item itself; the slot's `role` and
 * `aria-hidden` replace its own `role="separator"`.
 */
const MuiSeparator = (props: AutocompleteSeparatorSlotProps) => (
  <Divider component="li" sx={{ my: 0.5 }} {...props} />
);

/**
 * MUI empty state
 *
 * Secondary `Typography` in place of the rows.
 */
const MuiEmpty = ({ message }: AutocompleteEmptySlotProps) => (
  <li>
    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
      {message}
    </Typography>
  </li>
);

/**
 * MUI loading state
 *
 * A `CircularProgress` beside the message.
 */
const MuiLoading = ({ message }: AutocompleteLoadingSlotProps) => (
  <li>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1 }}>
      <CircularProgress size={16} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  </li>
);

/**
 * MUI error state
 *
 * The message in the error color and a retry `Button`.
 */
const MuiError = ({ error, onRetry, retryLabel }: AutocompleteErrorSlotProps) => (
  <li>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1 }}>
      <Typography variant="body2" color="error">
        {error}
      </Typography>
      {onRetry ? (
        <Button size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  </li>
);

/**
 * MUI create row
 *
 * A full-width `Button` offering to create whatever was searched for.
 */
const MuiCreate = ({ onCreate, loading, label }: AutocompleteCreateSlotProps) => (
  <li>
    <Button size="small" fullWidth disabled={loading} onClick={onCreate}>
      {label}
    </Button>
  </li>
);

/**
 * MUI load-more row
 *
 * The paging sentinel, which is also a `Button` so the next page is reachable
 * without a pointer.
 */
const MuiLoadMore = ({ ref, onLoadMore, loading, label }: AutocompleteLoadMoreSlotProps) => (
  <li ref={ref}>
    <Button size="small" fullWidth disabled={loading} onClick={onLoadMore}>
      {label}
    </Button>
  </li>
);

/**
 * MUI components
 *
 * The slot map an MUI v7 project would pass as `components`, built from the
 * primitives — `Paper`, `MenuItem`, `Chip`, `InputBase` — rather than from
 * MUI's own `Autocomplete`, which is a competing engine.
 */
export const muiAutocomplete: Partial<AutocompleteComponents> = {
  Root: MuiRoot,
  Trigger: MuiTrigger,
  TriggerInput: MuiTriggerInput,
  Toggle: MuiToggle,
  Value: MuiValue,
  Tag: MuiTag,
  Clear: MuiClear,
  Indicator: MuiIndicator,
  Popup: MuiPopup,
  Search: MuiSearch,
  List: MuiList,
  Option: MuiOption,
  OptionLabel: MuiOptionLabel,
  Check: MuiCheck,
  Group: MuiGroup,
  GroupLabel: MuiGroupLabel,
  Separator: MuiSeparator,
  Empty: MuiEmpty,
  Loading: MuiLoading,
  Error: MuiError,
  Create: MuiCreate,
  LoadMore: MuiLoadMore,
};
