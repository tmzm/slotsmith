import {
  Button,
  ButtonGroup,
  Center,
  Checkbox,
  EmptyState,
  IconButton,
  NativeSelect,
  Pagination,
  Skeleton,
  Spinner,
  Table,
  VStack,
} from "@chakra-ui/react";
import type {
  CellSlotProps,
  CheckboxSlotProps,
  DataTableComponents,
  EmptySlotProps,
  ErrorSlotProps,
  HeaderCellSlotProps,
  PaginationSlotProps,
  RowSlotProps,
  SectionSlotProps,
  TableSlotProps,
} from "../../../index";

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
 * Chakra row
 *
 * `Table.Row` with a transparent background, like anes-track-new, and the
 * selected state mapped onto Chakra's `bg` prop.
 */
const ChakraRow = (props: RowSlotProps) => (
  <Table.Row bg={props["data-state" as keyof RowSlotProps] === "selected" ? "bg.muted" : "transparent"} {...props} />
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
 * anes-track-new's `Pagination.Root` (with `count` as the total row count),
 * plus a `NativeSelect` for the page size, which that project doesn't have.
 */
function ChakraPagination({ pageIndex, pageSize, pageSizeOptions, rowCount, setPageIndex, setPageSize, labels }: PaginationSlotProps) {
  return (
    <Pagination.Root
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
      <NativeSelect.Root size="sm" width="auto">
        <NativeSelect.Field
          aria-label="Rows per page"
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
    </Pagination.Root>
  );
}

/**
 * Chakra empty state
 *
 * anes-track-new's `EmptyState` block.
 */
const ChakraEmpty = ({ message }: EmptySlotProps) => (
  <EmptyState.Root>
    <EmptyState.Content>
      <VStack textAlign="center">
        <EmptyState.Title>{message}</EmptyState.Title>
        <EmptyState.Description>Try changing your filters</EmptyState.Description>
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
 * The slot map a Chakra UI v3 project (anes-track-new) would pass as `components`.
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
};

/**
 * Chakra loading
 *
 * anes-track-new shows one centered spinner instead of skeleton rows; this
 * `Skeleton` slot does the same in the first cell only.
 */
export const ChakraSpinnerSkeleton = ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) =>
  rowIndex === 0 && columnIndex === 0 ? (
    <Center>
      <Spinner size="sm" />
    </Center>
  ) : null;
