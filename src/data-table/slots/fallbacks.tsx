import { useEffect, useId, useMemo, useRef } from "react";
import { Autocomplete } from "../../autocomplete/Autocomplete";
import type { OptionValue } from "../../autocomplete/core/types";
import { useLocaleSection } from "../../locale/useLocaleSection";
import { createNumber } from "../../locale/plural";
import { cx } from "../../shared/cx";
import { classes } from "../classes";
import { defaultReorderLabels } from "../core/reorderLabels";
import { useDataTableContext } from "./context";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronIcon, GripIcon } from "./icons";
import type {
  CellSlotProps,
  CheckboxSlotProps,
  DataTableComponents,
  DataTableLabels,
  DragHandleSlotProps,
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

export { cx };

/**
 * Root fallback
 *
 * `<div class="sdt">`.
 */
const Root = ({ className, ...props }: RootSlotProps) => (
  <div className={cx(classes.root, className)} {...props} />
);

/**
 * Table fallback
 *
 * `<table class="sdt__table">`.
 */
const Table = ({ className, ...props }: TableSlotProps) => (
  <table className={cx(classes.table, className)} {...props} />
);

/**
 * Head fallback
 *
 * `<thead class="sdt__head">`.
 */
const Head = ({ className, ...props }: SectionSlotProps) => (
  <thead className={cx(classes.head, className)} {...props} />
);

/**
 * Body fallback
 *
 * `<tbody class="sdt__body">`.
 */
const Body = ({ className, ...props }: SectionSlotProps) => (
  <tbody className={cx(classes.body, className)} {...props} />
);

/**
 * Foot fallback
 *
 * `<tfoot class="sdt__foot">`.
 */
const Foot = ({ className, ...props }: SectionSlotProps) => (
  <tfoot className={cx(classes.foot, className)} {...props} />
);

/**
 * Footer row fallback
 *
 * `<tr class="sdt__row">` in the foot.
 */
const FooterRow = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx(classes.row, className)} {...props} />
);

/**
 * Footer cell fallback
 *
 * `<td class="sdt__cell">` in the foot.
 */
const FooterCell = ({ className, ...props }: CellSlotProps) => (
  <td className={cx(classes.cell, className)} {...props} />
);

/**
 * Header row fallback
 *
 * `<tr class="sdt__row">` in the head.
 */
const HeaderRow = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx(classes.row, className)} {...props} />
);

/**
 * Header cell fallback
 *
 * `<th class="sdt__cell">`.
 */
const HeaderCell = ({ className, ...props }: HeaderCellSlotProps) => (
  <th className={cx(classes.cell, className)} {...props} />
);

/**
 * Row fallback
 *
 * `<tr class="sdt__row">` in the body.
 */
const Row = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx(classes.row, className)} {...props} />
);

/**
 * Cell fallback
 *
 * `<td class="sdt__cell">`.
 */
const Cell = ({ className, ...props }: CellSlotProps) => (
  <td className={cx(classes.cell, className)} {...props} />
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
      className={classes.checkbox}
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
    <button type="button" className={classes.sort} data-sorted={direction || undefined} onClick={onClick}>
      {children}
      <span className={classes.sortIcon}>
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
    className={classes.expand}
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
const Skeleton = (_: SkeletonSlotProps) => <div className={classes.skeleton} />;

/**
 * Empty fallback
 *
 * A centered, muted message.
 */
const Empty = ({ message }: EmptySlotProps) => <div className={classes.message}>{message}</div>;

/**
 * Error fallback
 *
 * The message with a retry button, announced with `role="alert"`.
 */
const ErrorState = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <div className={classes.error} role="alert">
    <span>{message}</span>
    {onRetry && (
      <button type="button" className={classes.button} onClick={onRetry}>
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
  <button type="button" className={cx(classes.button, classes.buttonIcon)} {...props}>
    <ChevronIcon direction={direction} />
  </button>
);

/**
 * Page size select fallback
 *
 * The slotsmith autocomplete as a plain single select, so the table's one
 * dropdown looks and behaves like the library's others: no search box for a
 * handful of numbers, and no clear control, because a page always has a size.
 * The visible label names the combobox and focuses it when clicked, the option
 * numbers are written in the table's digits, and the table's `locale` is passed on
 * so its announcements follow the table's language.
 */
const PageSizeSelect = ({ value, options, onValueChange, label }: PageSizeSelectSlotProps) => {
  const id = useId();
  const { locale } = useDataTableContext();
  const { code } = useLocaleSection("table", locale);
  const root = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const number = code === undefined ? String : createNumber(code);
    return options.map((option) => ({ value: option, label: number(option) }));
  }, [options, code]);
  return (
    <div className={classes.pageSize} ref={root}>
      <span id={id} onClick={() => root.current?.querySelector<HTMLElement>("[role=combobox]")?.focus()}>
        {label}
      </span>
      <Autocomplete
        className={classes.pageSizeSelect}
        aria-labelledby={id}
        options={items}
        value={value}
        onChange={(next: OptionValue | null) => {
          if (next !== null) onValueChange(Number(next));
        }}
        searchable={false}
        clearable={false}
        matchTriggerWidth={false}
        locale={locale}
      />
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
    <nav className={classes.pagination} aria-label={labels.pagination}>
      <div className={classes.paginationButtons}>
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
      <span className={classes.paginationInfo} aria-live="polite">
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
 * Drag handle fallback
 *
 * A `<button>` holding the grip icon. Everything the table passes lands on the
 * button. The table finds rows from the drag events, so no ref is involved.
 */
const DragHandle = ({ className, ...props }: DragHandleSlotProps) => (
  <button type="button" className={cx(classes.drag, className)} {...props}>
    <GripIcon />
  </button>
);

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
  Foot,
  FooterRow,
  FooterCell,
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
  DragHandle,
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
  ...defaultReorderLabels,
};
