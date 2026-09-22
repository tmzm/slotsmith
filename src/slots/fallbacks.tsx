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

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ") || undefined;

/* ----------------------------------------------------------- element slots */

const Root = ({ className, ...props }: RootSlotProps) => (
  <div className={cx("rdt", className)} {...props} />
);
const Table = ({ className, ...props }: TableSlotProps) => (
  <table className={cx("rdt__table", className)} {...props} />
);
const Head = ({ className, ...props }: SectionSlotProps) => (
  <thead className={cx("rdt__head", className)} {...props} />
);
const Body = ({ className, ...props }: SectionSlotProps) => (
  <tbody className={cx("rdt__body", className)} {...props} />
);
const HeaderRow = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx("rdt__row", className)} {...props} />
);
const HeaderCell = ({ className, ...props }: HeaderCellSlotProps) => (
  <th className={cx("rdt__cell", className)} {...props} />
);
const Row = ({ className, ...props }: RowSlotProps) => (
  <tr className={cx("rdt__row", className)} {...props} />
);
const Cell = ({ className, ...props }: CellSlotProps) => (
  <td className={cx("rdt__cell", className)} {...props} />
);

/* ------------------------------------------------------------ widget slots */

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

const SortIcon = ({ direction }: SortIconSlotProps) =>
  direction === "asc" ? <ArrowUpIcon /> : direction === "desc" ? <ArrowDownIcon /> : <ArrowUpDownIcon />;

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

const Skeleton = (_: SkeletonSlotProps) => <div className="rdt__skeleton" />;

const Empty = ({ message }: EmptySlotProps) => <div className="rdt__placeholder">{message}</div>;

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

const PaginationButton = ({ direction, ...props }: PaginationButtonSlotProps) => (
  <button type="button" className="rdt__button rdt__button--icon" {...props}>
    <ChevronIcon direction={direction} />
  </button>
);

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

/** The built-in plain-HTML slots. Wrap or reuse them in your own slots. */
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
