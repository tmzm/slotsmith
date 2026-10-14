/**
 * DataTable for Chakra UI
 *
 * A `components` map that renders the slotsmith data table with Chakra UI
 * primitives, tested against Chakra UI v3. Copy the file, keep the parts you
 * want, and pass the map as `components={chakraDataTable}`; every slot left
 * out keeps its fallback.
 */
import {
  Box,
  Button,
  ButtonGroup,
  Center,
  Checkbox,
  EmptyState,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Pagination,
  Skeleton,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useId } from "react";
import {
  fallbackComponents,
  type CellEditorSlotProps,
  type CellSlotProps,
  type CheckboxSlotProps,
  type DataTableComponents,
  type DragHandleSlotProps,
  type EmptySlotProps,
  type ErrorSlotProps,
  type FillHandleSlotProps,
  type HeaderCellSlotProps,
  type PaginationSlotProps,
  type RowSlotProps,
  type SectionSlotProps,
  type TableSlotProps,
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
const ChakraCell = (props: CellSlotProps) => <Table.Cell css={cellCss} {...props} />;

/**
 * Spreadsheet cell styles
 *
 * In spreadsheet mode a body cell carries its part in the selection as
 * `data-*` attributes: the active cell and the one being edited get a ring
 * in the palette's solid colour, the selected range its subtle tint, the
 * cells a fill drag would write and the copied ones a muted tint with a thin
 * ring. Read-only cells are muted. Cells cannot be selected as text, except
 * in the editor.
 */
const cellCss = {
  "&[data-column-id]": { cursor: "cell", outline: "none", userSelect: "none", scrollMarginTop: "3em" },
  "&[data-selected]": { bg: "colorPalette.subtle" },
  "&:is([data-fill-preview], [data-copied])": { bg: "bg.muted", boxShadow: "inset 0 0 0 1px {colors.colorPalette.muted}" },
  "&:is([data-active], [data-editing])": { boxShadow: "inset 0 0 0 2px {colors.colorPalette.solid}" },
  "&[data-editing]": { bg: "bg" },
  "&[aria-readonly=true]": { color: "fg.muted" },
  "& input": { userSelect: "text" },
} as const;

/**
 * Chakra cell editor
 *
 * Text and numbers are edited in an `Input` with no border of its own, so
 * the cell itself is the field, with the validation message on an error chip
 * above the cell. Selects and dates keep the built-in editor, the slotsmith
 * `Autocomplete` and `DatePicker`, which wear the Chakra adapters given to
 * `SlotsmithProvider`.
 */
function ChakraCellEditor(props: CellEditorSlotProps) {
  const errorId = useId();
  if (props.kind !== "text" && props.kind !== "number") return <fallbackComponents.CellEditor {...props} />;
  const { onValueChange, error } = props;
  return (
    <Box display="flex" alignItems="center" flex="1" minW="0" px="3">
      <Input
        size="sm"
        variant="flushed"
        borderBottomWidth="0"
        h="auto"
        minH="0"
        px="0"
        fontSize="inherit"
        outline="none"
        _focusVisible={{ boxShadow: "none", outline: "none" }}
        value={props.value}
        onChange={(event) => onValueChange(event.target.value)}
        inputMode={props.kind === "number" ? "decimal" : undefined}
        autoComplete="off"
        spellCheck={false}
        aria-label={props["aria-label"]}
        aria-invalid={error !== null || undefined}
        aria-describedby={error !== null ? errorId : undefined}
      />
      {error !== null && (
        <Text
          id={errorId}
          role="alert"
          textStyle="xs"
          position="absolute"
          bottom="100%"
          insetInlineStart="0"
          zIndex="3"
          mb="0.5"
          px="2"
          borderRadius="sm"
          whiteSpace="nowrap"
          color="fg.inverted"
          bg="red.solid"
        >
          {error}
        </Text>
      )}
    </Box>
  );
}

/**
 * Chakra fill handle
 *
 * A small square in the palette's solid colour inside the selection's corner, so it never overflows the scroll area.
 */
const ChakraFillHandle = (props: FillHandleSlotProps) => (
  <Box
    as="span"
    position="absolute"
    zIndex="2"
    insetBlockEnd="0"
    insetInlineEnd="0"
    w="7px"
    h="7px"
    boxSizing="border-box"
    bg="colorPalette.solid"
    borderWidth="1px"
    borderColor="bg"
    cursor="crosshair"
    touchAction="none"
    {...props}
  />
);

/**
 * Chakra checkbox adapter
 *
 * Chakra v3's compound checkbox: `checked` takes `"indeterminate"` and
 * `onCheckedChange` receives `{ checked }`.
 */
const ChakraCheckbox = ({ checked, indeterminate, disabled, onCheckedChange, tabIndex, ...aria }: CheckboxSlotProps) => (
  <Checkbox.Root
    size="sm"
    checked={indeterminate ? "indeterminate" : checked}
    disabled={disabled}
    onCheckedChange={(details) => onCheckedChange(details.checked === true)}
    onClick={(event) => event.stopPropagation()}
  >
    <Checkbox.HiddenInput aria-label={aria["aria-label"]} tabIndex={tabIndex} />
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
export const chakraDataTable: Partial<DataTableComponents> = {
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
  CellEditor: ChakraCellEditor,
  FillHandle: ChakraFillHandle,
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
