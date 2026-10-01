/**
 * DataTable for Chakra UI
 *
 * A `components` map that renders the slotsmith data table with Chakra UI
 * primitives, tested against Chakra UI v3. Copy the file, keep the parts you
 * want, and pass the map as `components={chakraComponents}`; every slot left
 * out keeps its fallback.
 */
import {
  Button,
  ButtonGroup,
  Center,
  Checkbox,
  EmptyState,
  HStack,
  IconButton,
  NativeSelect,
  Pagination,
  Skeleton,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useId } from "react";
import type {
  CellSlotProps,
  CheckboxSlotProps,
  DataTableComponents,
  DragHandleSlotProps,
  EmptySlotProps,
  ErrorSlotProps,
  HeaderCellSlotProps,
  PaginationSlotProps,
  RowSlotProps,
  SectionSlotProps,
  TableSlotProps,
} from "slotsmith/data-table";

/**
 * Chakra table
 *
 * `Table.Root` renders the `<table>`.
 */
const ChakraTable = (props: TableSlotProps) => <Table.Root {...props} />;

/**
 * Chakra header / body
 *
 * `Table.Header` and `Table.Body`.
 */
const ChakraHead = (props: SectionSlotProps) => <Table.Header {...props} />;
const ChakraBody = (props: SectionSlotProps) => <Table.Body {...props} />;

/**
 * Row drag styles
 *
 * While a row is lifted (`data-dragging`), it and its visible sub-rows
 * (`data-dragging-child`) are drawn above the rows they pass, with opaque
 * cells so those rows never show through, and one shadow under the block.
 * With reduced motion nothing slides: the block is dimmed and a line on
 * `data-drop-edge` shows where it will land.
 */
const rowDragCss = {
  "&[data-dragging], &[data-dragging-child]": { position: "relative", zIndex: 1, "& > td": { bg: "bg.muted" } },
  "&[data-dragging]": { boxShadow: "md" },
  "&[data-dragging]:has(+ [data-dragging-child])": { boxShadow: "none" },
  "&[data-dragging-child]:not(:has(+ [data-dragging-child]))": { boxShadow: "md" },
  _motionReduce: {
    "&[data-dragging], &[data-dragging-child]": { boxShadow: "none !important", "& > td": { opacity: 0.5 } },
    "&[data-drop-edge=before] > td": { boxShadow: "inset 0 2px 0 0 {colors.colorPalette.solid}" },
    "&[data-drop-edge=after] > td": { boxShadow: "inset 0 -2px 0 0 {colors.colorPalette.solid}" },
  },
} as const;

/**
 * Chakra row
 *
 * `Table.Row` with a transparent background for a dense table, the selected
 * state mapped onto Chakra's `bg` prop, and the drag styles for row
 * reordering.
 */
const ChakraRow = (props: RowSlotProps) => (
  <Table.Row
    bg={props["data-state" as keyof RowSlotProps] === "selected" ? "bg.muted" : "transparent"}
    css={rowDragCss}
    {...props}
  />
);

/**
 * Chakra drag handle
 *
 * A small ghost `IconButton` with a six-dot grip. Every slot prop goes to its
 * `<button>`: the ref, the pointer and key handlers, the `aria-*`
 * attributes and `disabled`.
 */
const ChakraDragHandle = (props: DragHandleSlotProps) => (
  <IconButton
    variant="ghost"
    size="xs"
    color="fg.muted"
    cursor={props["data-dragging"] === undefined ? "grab" : "grabbing"}
    {...props}
  >
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  </IconButton>
);

/**
 * Chakra header cell / cell
 *
 * `Table.ColumnHeader` and `Table.Cell`.
 */
const ChakraHeaderCell = (props: HeaderCellSlotProps) => <Table.ColumnHeader {...props} />;
const ChakraCell = (props: CellSlotProps) => <Table.Cell {...props} />;

/**
 * Chakra checkbox adapter
 *
 * Chakra v3's compound checkbox: `checked` takes `"indeterminate"` and
 * `onCheckedChange` receives `{ checked }`.
 */
const ChakraCheckbox = ({ checked, indeterminate, disabled, onCheckedChange, ...aria }: CheckboxSlotProps) => (
  <Checkbox.Root
    size="sm"
    checked={indeterminate ? "indeterminate" : checked}
    disabled={disabled}
    onCheckedChange={(details) => onCheckedChange(details.checked === true)}
    onClick={(event) => event.stopPropagation()}
  >
    <Checkbox.HiddenInput aria-label={aria["aria-label"]} />
    <Checkbox.Control />
  </Checkbox.Root>
);

/**
 * Chakra pagination
 *
 * A compact pagination bar: Chakra's `Pagination.Root` (with `count` as the
 * total row count) for the pages, and a `NativeSelect` for the page size,
 * named by the `labels.rowsPerPage` text beside it. Padding above keeps the
 * bar clear of the last row's border.
 */
function ChakraPagination({ pageIndex, pageSize, pageSizeOptions, rowCount, setPageIndex, setPageSize, labels }: PaginationSlotProps) {
  const rowsPerPageId = useId();
  return (
    <Pagination.Root
      pt="3"
      mb="2"
      mx="2"
      count={rowCount}
      pageSize={pageSize}
      page={pageIndex + 1}
      onPageChange={({ page }) => setPageIndex(page - 1)}
      display="flex"
      justifyContent="space-between"
    >
      <ButtonGroup variant="ghost" size="sm">
        <Pagination.PrevTrigger asChild>
          <IconButton aria-label={labels.previousPage}>‹</IconButton>
        </Pagination.PrevTrigger>
        <Pagination.Items
          render={(page) => <IconButton variant={{ base: "ghost", _selected: "outline" }}>{page.value}</IconButton>}
        />
        <Pagination.NextTrigger asChild>
          <IconButton aria-label={labels.nextPage}>›</IconButton>
        </Pagination.NextTrigger>
      </ButtonGroup>
      <HStack gap="2">
        <Text id={rowsPerPageId} textStyle="sm">
          {labels.rowsPerPage}
        </Text>
        <NativeSelect.Root size="sm" width="auto">
          <NativeSelect.Field
            aria-labelledby={rowsPerPageId}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.currentTarget.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>
    </Pagination.Root>
  );
}

/**
 * Chakra empty state
 *
 * Chakra's `EmptyState` block, centred in the table body.
 */
const ChakraEmpty = ({ message }: EmptySlotProps) => (
  <EmptyState.Root>
    <EmptyState.Content>
      <VStack textAlign="center">
        <EmptyState.Title>{message}</EmptyState.Title>
      </VStack>
    </EmptyState.Content>
  </EmptyState.Root>
);

/**
 * Chakra error state
 *
 * An `EmptyState` with a retry button.
 */
const ChakraError = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <EmptyState.Root>
    <EmptyState.Content>
      <EmptyState.Title>{message}</EmptyState.Title>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </EmptyState.Content>
  </EmptyState.Root>
);

/**
 * Chakra components
 *
 * The slot map a Chakra UI v3 project would pass as `components`, styled as
 * a dense table.
 */
export const chakraComponents: Partial<DataTableComponents> = {
  Table: ChakraTable,
  Head: ChakraHead,
  Body: ChakraBody,
  HeaderRow: ChakraRow,
  Row: ChakraRow,
  HeaderCell: ChakraHeaderCell,
  Cell: ChakraCell,
  Checkbox: ChakraCheckbox,
  Skeleton: () => <Skeleton height="4" />,
  Empty: ChakraEmpty,
  Error: ChakraError,
  Pagination: ChakraPagination,
  DragHandle: ChakraDragHandle,
};

/**
 * Chakra loading
 *
 * One centred spinner instead of skeleton rows, which suits a dense table:
 * this `Skeleton` slot draws it in the first cell only.
 */
export const ChakraSpinnerSkeleton = ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) =>
  rowIndex === 0 && columnIndex === 0 ? (
    <Center>
      <Spinner size="sm" />
    </Center>
  ) : null;
