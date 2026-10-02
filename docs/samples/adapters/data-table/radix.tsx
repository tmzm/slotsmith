/**
 * DataTable for Radix Themes
 *
 * A `components` map that renders the slotsmith data table with Radix Themes
 * primitives, tested against Radix Themes v3. Copy the file, keep the parts
 * you want, and pass the map as `components={radixComponents}`; every slot left
 * out keeps its fallback.
 *
 * This is Radix Themes (`@radix-ui/themes`), the styled library; an app on the
 * bare Radix primitives wants the shadcn/ui adapter, which is built on them.
 */
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
} from "@radix-ui/react-icons";
import { Button, Checkbox, Flex, IconButton, SegmentedControl, Skeleton, Table, Text } from "@radix-ui/themes";
import { useId } from "react";
import {
  useDataTableContext,
  type CellSlotProps,
  type CheckboxSlotProps,
  type DataTableComponents,
  type DragHandleSlotProps,
  type EmptySlotProps,
  type ErrorSlotProps,
  type ExpandToggleSlotProps,
  type HeaderCellSlotProps,
  type PageSizeSelectSlotProps,
  type PaginationButtonSlotProps,
  type PaginationSlotProps,
  type RootSlotProps,
  type RowSlotProps,
  type SectionSlotProps,
  type SortIconSlotProps,
  type SortTriggerSlotProps,
  type TableSlotProps,
} from "slotsmith/data-table";

/**
 * Radix Themes table parts
 *
 * Built from Radix Themes v3 — `Table.*`, `Button`, `IconButton`,
 * `Checkbox`, `SegmentedControl`, `Skeleton`, `Text` and Radix icons. The
 * colours are Radix's own variables (`--accent-*`, `--gray-*`,
 * `--color-panel-solid`), so the table follows the app's
 * `<Theme accentColor appearance>`. The app must import
 * `@radix-ui/themes/styles.css`, as every Radix Themes app already does.
 *
 * `Table.Root` draws its own `<table>` inside its own scroll area, while the
 * data table owns its scroll box and its `<table>`, so the root and the table
 * take `Table.Root`'s classes instead (`rt-TableRoot`, `rt-TableRootTable`);
 * the sections, rows and cells are `Table.*` components as they are.
 *
 * Radix's `Button` and `IconButton` render a `<button>` with no `type`, which
 * would submit a surrounding form, so each one here is given
 * `type="button"` ahead of the slot's props.
 */

/**
 * Table sheet
 *
 * Radix Themes has no props for hover, for the selected row or for the
 * `data-*` attributes the table sets while a row is dragged (`data-dragging`,
 * `data-dragging-child`, `data-drop-edge`), so those looks come from one
 * sheet scoped to the table. Radix Themes offers no nonce setting either: an
 * app with a strict `style-src` policy adds its nonce to the `<style>` here.
 *
 * While a row is lifted, it and its visible sub-rows are drawn above the rows
 * they pass, with opaque cells so those rows never show through, and one
 * shadow under the block. With reduced motion nothing slides: the block is
 * dimmed and a line on `data-drop-edge` shows where it will land.
 *
 * Arrows marked `data-flip` turn round on a right-to-left page.
 *
 * @param scope - The class on this table's root.
 * @returns The sheet's text.
 */
function tableSheet(scope: string) {
  const s = `.${scope}`;
  const lifted = `${s} tbody > tr[data-dragging]`;
  const child = `${s} tbody > tr[data-dragging-child]`;
  return `
${s} { overflow: hidden; }
${s} > div { overflow: auto; }
${s} th { position: sticky; top: 0; z-index: 2; background-color: var(--color-panel-solid); background-image: linear-gradient(var(--gray-a2), var(--gray-a2)); white-space: nowrap; }
${s} :is(th, td):is([data-slot=drag], [data-slot=select]) { width: 1%; padding-inline-end: 0; }
${s} tfoot td { font-weight: var(--font-weight-bold); box-shadow: inset 0 1px var(--gray-a5); }
${s} tbody > tr:hover > td { background-color: var(--gray-a2); }
${s} tbody > tr[data-state=selected] > td { background-color: var(--accent-a3); }
${s} tbody > tr[data-clickable] { cursor: pointer; }
${lifted}, ${child} { position: relative; z-index: 1; }
${lifted} > td, ${child} > td { background-color: var(--color-panel-solid); background-image: linear-gradient(var(--gray-a3), var(--gray-a3)); }
${lifted} { box-shadow: var(--shadow-4); }
${lifted}:has(+ tr[data-dragging-child]) { box-shadow: none; }
${child}:not(:has(+ tr[data-dragging-child])) { box-shadow: var(--shadow-4); }
[dir=rtl] ${s} [data-flip], ${s}[dir=rtl] [data-flip] { transform: scaleX(-1); }
@media (prefers-reduced-motion: reduce) {
  ${lifted}, ${child} { box-shadow: none !important; }
  ${lifted} > td, ${child} > td { opacity: 0.5; }
  ${s} tbody > tr[data-drop-edge=before] > td { box-shadow: inset 0 2px 0 0 var(--accent-9); }
  ${s} tbody > tr[data-drop-edge=after] > td { box-shadow: inset 0 -2px 0 0 var(--accent-9); }
}`;
}

/**
 * Radix root
 *
 * The surface `Table.Root` draws, around the table and its pagination,
 * carrying the scoped sheet. `useId` gives each table its own scope; the
 * characters React wraps it in are not valid in a class name, so they are
 * dropped.
 */
function RadixRoot({ className, children, ...props }: RootSlotProps) {
  const scope = `ss-radix-table-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <div className={[scope, "rt-TableRoot rt-r-size-2 rt-variant-surface", className].filter(Boolean).join(" ")} {...props}>
      <style>{tableSheet(scope)}</style>
      {children}
    </div>
  );
}

/**
 * Radix table elements
 *
 * The `<table>` takes `Table.Root`'s table class; the rest are `Table.*`
 * parts. Radix Themes drops the DOM `color` attribute from these, since its
 * own `color` prop is an accent, so it is left out here too. Radix also reads
 * a cell's `width` as a layout prop and turns it into a style, so a DOM
 * `width` given through `slotProps.cell` or `slotProps.footerCell` is not
 * forwarded; set a cell's width with `style` or a class instead. Radix has no
 * footer section, so the foot is a plain `<tfoot>` of `Table.Cell`s.
 */
const RadixTable = ({ className, ...props }: TableSlotProps) => (
  <table className={className ? `rt-TableRootTable ${className}` : "rt-TableRootTable"} {...props} />
);
const RadixHead = ({ color: _color, ...props }: SectionSlotProps) => <Table.Header {...props} />;
const RadixBody = ({ color: _color, ...props }: SectionSlotProps) => <Table.Body {...props} />;
const RadixFoot = (props: SectionSlotProps) => <tfoot {...props} />;
const RadixRow = ({ color: _color, ...props }: RowSlotProps) => <Table.Row {...props} />;
const RadixHeaderCell = ({ color: _color, ...props }: HeaderCellSlotProps) => <Table.ColumnHeaderCell {...props} />;
const RadixCell = ({ color: _color, width: _width, ...props }: CellSlotProps) => <Table.Cell {...props} />;

/**
 * Radix drag handle
 *
 * A ghost `IconButton` with the `DragHandleDots2Icon` grip. Every slot prop
 * goes to its `<button>`: the ref, the pointer and key handlers, the `aria-*`
 * attributes and `disabled`. `touch-action: none` keeps a touch drag from
 * scrolling the page instead of moving the row.
 */
const RadixDragHandle = ({ style, ...props }: DragHandleSlotProps) => (
  <IconButton
    type="button"
    variant="ghost"
    color="gray"
    size="1"
    style={{ cursor: props["data-dragging"] === undefined ? "grab" : "grabbing", touchAction: "none", ...style }}
    {...props}
  >
    <DragHandleDots2Icon />
  </IconButton>
);

/**
 * Radix checkbox adapter
 *
 * Radix's `Checkbox` has no `indeterminate` prop: it reports the mixed state
 * as the checked value `"indeterminate"`. So the slot's flag goes in as that
 * value, and a change comes out as a plain boolean; from the mixed state
 * Radix moves to `true`, which selects everything. The click is stopped so
 * it does not also count as a click on the row.
 */
const RadixCheckbox = ({ checked, indeterminate, disabled, onCheckedChange, ...aria }: CheckboxSlotProps) => (
  <Checkbox
    checked={indeterminate ? "indeterminate" : checked}
    disabled={disabled}
    onCheckedChange={(state) => onCheckedChange(state === true)}
    onClick={(event) => event.stopPropagation()}
    aria-label={aria["aria-label"]}
  />
);

/**
 * Radix sort trigger
 *
 * A ghost `Button` holding the header and the `SortIcon` slot. Radix pulls
 * ghost buttons back by their own padding, so the header text lines up with
 * the cells below.
 */
function RadixSortTrigger({ direction, onClick, children }: SortTriggerSlotProps) {
  const { components } = useDataTableContext();
  return (
    <Button type="button" variant="ghost" color="gray" size="2" highContrast onClick={onClick} style={{ fontWeight: "inherit" }}>
      {children}
      <components.SortIcon direction={direction} />
    </Button>
  );
}

/**
 * Radix sort icon
 *
 * An arrow in the accent colour on a sorted column, the muted up-and-down
 * caret on the others. Hidden from assistive technology: `aria-sort` on the
 * header already says which way the column is sorted.
 */
const RadixSortIcon = ({ direction }: SortIconSlotProps) => (
  <span
    aria-hidden="true"
    data-sort-icon=""
    style={{ display: "inline-flex", color: direction ? "var(--accent-11)" : "var(--gray-a8)" }}
  >
    {direction === "asc" ? <ArrowUpIcon /> : direction === "desc" ? <ArrowDownIcon /> : <CaretSortIcon />}
  </span>
);

/**
 * Radix expand toggle
 *
 * A ghost `IconButton` with a chevron that turns down when the row is open,
 * and points the way the page reads when it is closed.
 */
const RadixExpandToggle = ({ expanded, onToggle, depth: _depth, ...aria }: ExpandToggleSlotProps) => (
  <IconButton
    type="button"
    variant="ghost"
    color="gray"
    size="1"
    aria-expanded={expanded}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
    {...aria}
  >
    <span data-flip="" style={{ display: "inline-flex" }}>
      <ChevronRightIcon style={{ transform: expanded ? "rotate(90deg)" : undefined, transition: "transform 150ms" }} />
    </span>
  </IconButton>
);

/**
 * Radix skeleton
 *
 * A `Skeleton` bar in every cell, Radix's own pulse.
 */
const RadixSkeleton = () => <Skeleton width="100%" height="1em" />;

/**
 * Radix empty state
 *
 * The message in muted text, centred.
 */
const RadixEmpty = ({ message }: EmptySlotProps) => (
  <Flex justify="center" py="5">
    <Text size="2" color="gray">
      {message}
    </Text>
  </Flex>
);

/**
 * Radix error state
 *
 * The message in red and a soft retry `Button`, announced as an alert like
 * the built-in one.
 */
const RadixError = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <Flex direction="column" align="center" gap="2" py="5" role="alert">
    <Text size="2" color="red">
      {message}
    </Text>
    {onRetry && (
      <Button type="button" size="1" variant="soft" onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </Flex>
);

/**
 * Radix pagination button
 *
 * A soft `IconButton` with a chevron that points the way the page reads.
 */
const RadixPaginationButton = ({ direction, ...props }: PaginationButtonSlotProps) => (
  <IconButton type="button" size="1" variant="soft" color="gray" {...props}>
    <span data-flip="" style={{ display: "inline-flex" }}>
      {direction === "previous" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </span>
  </IconButton>
);

/**
 * Radix page-size select
 *
 * A `SegmentedControl` over the handful of page sizes, named by the visible
 * label beside it. Its values are strings, so the sizes are turned to and
 * from numbers.
 */
function RadixPageSizeSelect({ value, options, onValueChange, label }: PageSizeSelectSlotProps) {
  const id = useId();
  return (
    <Flex align="center" gap="2">
      <Text size="2" color="gray" id={id}>
        {label}
      </Text>
      <SegmentedControl.Root size="1" aria-labelledby={id} value={String(value)} onValueChange={(size) => onValueChange(Number(size))}>
        {options.map((size) => (
          <SegmentedControl.Item key={size} value={String(size)}>
            {size}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </Flex>
  );
}

/**
 * Radix pagination
 *
 * The built-in bar's layout — previous and next, the page info, the page
 * size — under the table's own hairline, composing the `PaginationButton`
 * and `PageSizeSelect` slots so either can still be swapped on its own.
 */
function RadixPagination({ labels, ...props }: PaginationSlotProps) {
  const { components } = useDataTableContext();
  return (
    <Flex asChild wrap="wrap" align="center" justify="between" gap="2" px="3" py="2" style={{ boxShadow: "inset 0 1px var(--gray-a5)" }}>
      <nav aria-label={labels.pagination}>
        <Flex gap="2">
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
        </Flex>
        <Text size="2" color="gray" aria-live="polite">
          {labels.pageInfo(props.pageIndex + 1, props.pageCount)}
        </Text>
        <components.PageSizeSelect
          value={props.pageSize}
          options={props.pageSizeOptions}
          onValueChange={props.setPageSize}
          label={labels.rowsPerPage}
        />
      </nav>
    </Flex>
  );
}

/**
 * Radix Themes components
 *
 * The slot map a Radix Themes v3 project would pass as `components`.
 */
export const radixComponents: Partial<DataTableComponents> = {
  Root: RadixRoot,
  Table: RadixTable,
  Head: RadixHead,
  Body: RadixBody,
  Foot: RadixFoot,
  HeaderRow: RadixRow,
  Row: RadixRow,
  FooterRow: RadixRow,
  HeaderCell: RadixHeaderCell,
  Cell: RadixCell,
  FooterCell: RadixCell,
  Checkbox: RadixCheckbox,
  SortTrigger: RadixSortTrigger,
  SortIcon: RadixSortIcon,
  ExpandToggle: RadixExpandToggle,
  Skeleton: RadixSkeleton,
  Empty: RadixEmpty,
  Error: RadixError,
  Pagination: RadixPagination,
  PaginationButton: RadixPaginationButton,
  PageSizeSelect: RadixPageSizeSelect,
  DragHandle: RadixDragHandle,
};
