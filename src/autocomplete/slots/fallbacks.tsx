import type { AutocompleteComponents, AutocompleteLabels } from "./types";
import { classes } from "../classes";

/**
 * Class names
 *
 * Joins the fallback's own class with whatever a caller passed, dropping
 * empties.
 *
 * @param values - Class names, or nothing.
 * @returns The joined class string, or `undefined`.
 */
const cx = (...values: (string | false | null | undefined)[]): string | undefined =>
  values.filter(Boolean).join(" ") || undefined;

/**
 * Chevron icon
 *
 * The closed / open affordance on the trigger.
 */
const ChevronIcon = () => (
  <svg className={classes.chevron} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * Check icon
 *
 * The mark on a selected option.
 */
const CheckIcon = () => (
  <svg className={classes.tick} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * Cross icon
 *
 * Shared by the clear control and each tag's remove control.
 */
const CrossIcon = () => (
  <svg className={classes.cross} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Plus icon
 *
 * The create row's affordance.
 */
const PlusIcon = () => (
  <svg className={classes.plus} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * Autocomplete fallbacks
 *
 * The built-in parts: plain, accessible HTML that is already finished, so the
 * component works without passing anything. Every one of them is replaceable
 * through `components`.
 *
 * @example
 * ```tsx
 * // Start from the fallbacks and change only the option row.
 * const components = { ...autocompleteFallbacks, OptionLabel: MyOptionRow };
 * ```
 */
export const autocompleteFallbacks: AutocompleteComponents = {
  Root: ({ className, ...props }) => <div className={cx(classes.root, className)} {...props} />,

  Trigger: ({ className, ...props }) => <div className={cx(classes.trigger, className)} {...props} />,

  Value: ({ label, placeholder, empty }) => (
    <span className={cx(classes.value, empty && classes.valueEmpty)}>{empty ? placeholder : label}</span>
  ),

  Tag: ({ label, onRemove, removeLabel, disabled }) => (
    <span className={classes.tag}>
      <span className={classes.tagLabel}>{label}</span>
      {!disabled && (
        <button
          type="button"
          className={classes.tagRemove}
          aria-label={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <CrossIcon />
        </button>
      )}
    </span>
  ),

  Clear: ({ onClick, ...aria }) => (
    <button
      type="button"
      className={classes.clear}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      {...aria}
    >
      <CrossIcon />
    </button>
  ),

  Indicator: ({ loading }) =>
    loading ? <span className={classes.spinner} aria-hidden="true" /> : <ChevronIcon />,

  Popup: ({ className, ...props }) => <div className={cx(classes.popup, className)} {...props} />,

  Search: ({ className, ...props }) => <input className={cx(classes.search, className)} {...props} />,

  List: ({ className, ...props }) => <ul className={cx(classes.list, className)} {...props} />,

  Option: ({ className, ...props }) => <li className={cx(classes.option, className)} {...props} />,

  OptionLabel: ({ label }) => <span className={classes.label}>{label}</span>,

  Check: ({ selected }) => (selected ? <CheckIcon /> : null),

  Empty: ({ message }) => <li className={classes.message}>{message}</li>,

  Loading: ({ message }) => (
    <li className={classes.message}>
      <span className={classes.spinner} aria-hidden="true" />
      {message}
    </li>
  ),

  Error: ({ error, onRetry, retryLabel }) => (
    <li className={classes.error}>
      <span>{error}</span>
      {onRetry ? (
        <button type="button" className={classes.button} onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </li>
  ),

  Create: ({ onCreate, loading, label }) => (
    <li className={classes.create}>
      <button type="button" className={classes.createButton} onClick={onCreate} disabled={loading}>
        <PlusIcon />
        {label}
      </button>
    </li>
  ),

  LoadMore: ({ ref, onLoadMore, loading, label }) => (
    <li ref={ref} className={classes.more}>
      <button type="button" className={classes.moreButton} onClick={onLoadMore} disabled={loading}>
        {loading ? <span className={classes.spinner} aria-hidden="true" /> : null}
        {label}
      </button>
    </li>
  ),
};

/**
 * Default autocomplete labels
 *
 * The English strings the fallbacks render. Override any of them through
 * `labels`; the rest keep these values.
 *
 * @example
 * ```tsx
 * <Autocomplete labels={{ placeholder: "اختر", empty: "لا توجد نتائج" }} options={options} />
 * ```
 */
export const defaultAutocompleteLabels: AutocompleteLabels = {
  placeholder: "Select…",
  search: "Search…",
  clear: "Clear selection",
  remove: (label) => `Remove ${label}`,
  empty: "No results",
  loading: "Loading…",
  minChars: (count) => `Type ${count} or more characters to search`,
  retry: "Retry",
  create: (query) => `Create “${query}”`,
  creating: "Creating…",
  more: (count) => `+${count}`,
  loadMore: "Load more",
  results: (count) => (count === 1 ? "1 result" : `${count} results`),
};
