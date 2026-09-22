import { useEffect, useId, useRef } from "react";
import { useDataTableContext } from "./context";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronIcon } from "./icons";
import type {
  CellSlotProps,
  CheckboxSlotProps,
  DataTableComponents,
  DataTableLabels,
  EmptySlotProps,
  ErrorSlotProps,
  ExpandToggleSlotProps,
  HeaderCellSlotProps,
  PageSizeSelectSlotProps,
  PaginationButtonSlotProps,
  PaginationSlotProps,
  RootSlotProps,
  RowSlotProps,
  SectionSlotProps,
  SkeletonSlotProps,
  SortIconSlotProps,
  SortTriggerSlotProps,
  TableSlotProps,
} from "./types";

/**
 * Class names
 *
 * Joins the truthy class names with spaces.
 *
 * @param classes - Class names; falsy values are skipped.
 * @returns The joined class names, or `undefined` when there are none.
 *
 * @example
 * ```ts
 * cx("rdt__row", selected && "is-selected"); // "rdt__row is-selected"
 * ```
 */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ") || undefined;

/**
 * Root fallback
 *
 * `<div class="rdt">`.
 */
const Root = ({ className, ...props }: RootSlotProps) => (
  <div className={cx("rdt", className)} {...props} />
);

/**
 * Table fallback
 *
 * `<table class="rdt__table">`.
 */
const Table = ({ className, ...props }: TableSlotProps) => (
  <table className={cx("rdt__table", className)} {...props} />
);

/**
 * Head fallback
 *
 * `<thead class="rdt__head">`.
 */
const Head = ({ className, ...props }: SectionSlotProps) => (
  <thead className={cx("rdt__head", className)} {...props} />
);

/**
 * Body fallback
 *
 * `<tbody class="rdt__body">`.
 */
const Body = ({ className, ...props }: SectionSlotProps) => (
  <tbody className={cx("rdt__body", className)} {...props} />
);

/**
 * Header row fallback
 *
 * `<tr class="rdt__row">` in the head.
 */
const HeaderRow = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx("rdt__row", className)} {...props} />
);

/**
 * Header cell fallback
 *
 * `<th class="rdt__cell">`.
 */
const HeaderCell = ({ className, ...props }: HeaderCellSlotProps) => (
  <th className={cx("rdt__cell", className)} {...props} />
);

/**
 * Row fallback
 *
 * `<tr class="rdt__row">` in the body.
 */
const Row = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx("rdt__row", className)} {...props} />
);

/**
 * Cell fallback
 *
 * `<td class="rdt__cell">`.
 */
const Cell = ({ className, ...props }: CellSlotProps) => (
  <td className={cx("rdt__cell", className)} {...props} />
);

/**
 * Checkbox fallback
 *
 * A native checkbox that supports the indeterminate state and doesn't trigger
 * `onRowClick`.
 */
const Checkbox = ({ checked, indeterminate, disabled, onCheckedChange, ...aria }: CheckboxSlotProps) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="rdt__checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
      onClick={(event) => event.stopPropagation()}
      {...aria}
    />
  );
};

/**
 * Sort icon fallback
 *
 * Up, down, or up-down arrows.
 */
const SortIcon = ({ direction }: SortIconSlotProps) =>
  direction === "asc" ? <ArrowUpIcon /> : direction === "desc" ? <ArrowDownIcon /> : <ArrowUpDownIcon />;

/**
 * Sort trigger fallback
 *
 * A `<button>` holding the header and the `SortIcon` slot.
 */
const SortTrigger = ({ direction, onClick, children }: SortTriggerSlotProps) => {
  const { components } = useDataTableContext();
  return (
    <button type="button" className="rdt__sort" data-sorted={direction || undefined} onClick={onClick}>
      {children}
      <span className="rdt__sort-icon">
        <components.SortIcon direction={direction} />
      </span>
    </button>
  );
};

/**
 * Expand toggle fallback
 *
 * A chevron `<button>` that rotates when expanded and doesn't trigger `onRowClick`.
 */
const ExpandToggle = ({ expanded, onToggle, depth: _depth, ...aria }: ExpandToggleSlotProps) => (
  <button
    type="button"
    className="rdt__expand"
    aria-expanded={expanded}
    data-expanded={expanded || undefined}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
    {...aria}
  >
    <ChevronIcon direction="next" />
  </button>
);

/**
 * Skeleton fallback
 *
 * A shimmering bar.
 */
const Skeleton = (_: SkeletonSlotProps) => <div className="rdt__skeleton" />;

/**
 * Empty fallback
 *
 * A centered, muted message.
 */
const Empty = ({ message }: EmptySlotProps) => <div className="rdt__placeholder">{message}</div>;

/**
 * Error fallback
 *
 * The message with a retry button, announced with `role="alert"`.
 */
const ErrorState = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <div className="rdt__placeholder rdt__placeholder--error" role="alert">
    <span>{message}</span>
    {onRetry && (
      <button type="button" className="rdt__button" onClick={onRetry}>
        {retryLabel}
      </button>
    )}
  </div>
);

/**
 * Pagination button fallback
 *
 * A chevron `<button>`; the chevron flips in RTL.
 */
const PaginationButton = ({ direction, ...props }: PaginationButtonSlotProps) => (
  <button type="button" className="rdt__button rdt__button--icon" {...props}>
    <ChevronIcon direction={direction} />
  </button>
);

/**
 * Page size select fallback
 *
 * A labelled native `<select>`.
 */
const PageSizeSelect = ({ value, options, onValueChange, label }: PageSizeSelectSlotProps) => {
  const id = useId();
  return (
    <div className="rdt__page-size">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="rdt__select"
        value={value}
        onChange={(event) => onValueChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Pagination fallback
 *
 * A `<nav>` with the `PaginationButton` slots, the page info and the
 * `PageSizeSelect` slot.
 */
const Pagination = (props: PaginationSlotProps) => {
  const { components } = useDataTableContext();
  const { labels } = props;
  return (
    <nav className="rdt__pagination" aria-label={labels.pagination}>
      <div className="rdt__pagination-buttons">
        <components.PaginationButton
          direction="previous"
          disabled={!props.canPreviousPage}
          onClick={props.previousPage}
          aria-label={labels.previousPage}
        />
        <components.PaginationButton
          direction="next"
          disabled={!props.canNextPage}
          onClick={props.nextPage}
          aria-label={labels.nextPage}
        />
      </div>
      <span className="rdt__pagination-info" aria-live="polite">
        {labels.pageInfo(props.pageIndex + 1, props.pageCount)}
      </span>
      <components.PageSizeSelect
        value={props.pageSize}
        options={props.pageSizeOptions}
        onValueChange={props.setPageSize}
        label={labels.rowsPerPage}
      />
    </nav>
  );
};

/**
 * Fallback components
 *
 * The built-in plain-HTML slots, used for every slot you don't replace.
 * Styled by the optional `slotsmith/styles.css`.
 *
 * @example
 * ```tsx
 * // Extend a fallback instead of rewriting it.
 * const Row = (props: RowSlotProps) => <fallbackComponents.Row {...props} className="h-12" />;
 * <DataTable components={{ Row }} />;
 * ```
 */
export const fallbackComponents: DataTableComponents = {
  Root,
  Table,
  Head,
  Body,
  HeaderRow,
  HeaderCell,
  Row,
  Cell,
  Checkbox,
  SortTrigger,
  SortIcon,
  ExpandToggle,
  Skeleton,
  Empty,
  Error: ErrorState,
  Pagination,
  PaginationButton,
  PageSizeSelect,
};

/**
 * Default labels
 *
 * The English text used for every label you don't override.
 *
 * @example
 * ```tsx
 * <DataTable labels={{ ...defaultLabels, empty: "Nothing here yet" }} />
 * ```
 */
export const defaultLabels: DataTableLabels = {
  empty: "No data found",
  error: "Something went wrong while loading the data.",
  retry: "Retry",
  rowsPerPage: "Rows per page",
  pageInfo: (page, pageCount) => `Page ${page} of ${pageCount}`,
  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  selectAll: "Select all rows on this page",
  selectRow: "Select row",
  expandRow: "Expand row",
  collapseRow: "Collapse row",
};
