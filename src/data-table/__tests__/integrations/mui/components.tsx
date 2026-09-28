import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { createSvgIcon } from "@mui/material/utils";
import type {
  CheckboxSlotProps,
  DataTableComponents,
  DragHandleSlotProps,
  EmptySlotProps,
  ErrorSlotProps,
  PaginationSlotProps,
  RootSlotProps,
  RowSlotProps,
  SkeletonSlotProps,
  SortIconSlotProps,
} from "../../../index";

/**
 * MUI root
 *
 * root-cms's `Stack` with hidden overflow around the table.
 */
const MuiRoot = (props: RootSlotProps) => <Stack overflow="hidden" {...props} />;

/**
 * Row drag styles
 *
 * While a row is lifted (`data-dragging`), it and its visible sub-rows
 * (`data-dragging-child`) are drawn above the rows they pass, with opaque
 * cells so those rows never show through, and one shadow under the block.
 * With reduced motion nothing slides: the block is dimmed and a line on
 * `data-drop-edge` shows where it will land.
 */
const rowDragSx: SxProps<Theme> = (theme) => ({
  "&[data-dragging], &[data-dragging-child]": {
    position: "relative",
    zIndex: 1,
    "& > td": {
      backgroundColor: theme.palette.background.paper,
      backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
    },
  },
  "&[data-dragging]": { boxShadow: theme.shadows[4] },
  "&[data-dragging]:has(+ [data-dragging-child])": { boxShadow: "none" },
  "&[data-dragging-child]:not(:has(+ [data-dragging-child]))": { boxShadow: theme.shadows[4] },
  "@media (prefers-reduced-motion: reduce)": {
    "&[data-dragging], &[data-dragging-child]": { boxShadow: "none !important", "& > td": { opacity: 0.5 } },
    "&[data-drop-edge=before] > td": { boxShadow: `inset 0 2px 0 0 ${theme.palette.primary.main}` },
    "&[data-drop-edge=after] > td": { boxShadow: `inset 0 -2px 0 0 ${theme.palette.primary.main}` },
  },
});

/**
 * MUI row
 *
 * `TableRow`, with the slot's `data-state="selected"` mapped onto MUI's
 * `selected` prop so the row gets `Mui-selected` styling, and the drag
 * styles for row reordering.
 */
const MuiRow = (props: RowSlotProps) => (
  <TableRow hover selected={props["data-state" as keyof RowSlotProps] === "selected"} sx={rowDragSx} {...props} />
);

/**
 * Drag indicator icon
 *
 * The path of `@mui/icons-material`'s `DragIndicator`, built with
 * `createSvgIcon` so the adapter needs no icons package.
 */
const DragIndicator = createSvgIcon(
  <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2m-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2" />,
  "DragIndicator",
);

/**
 * MUI drag handle
 *
 * A small `IconButton`. Every slot prop goes to its `<button>`: the ref, the
 * pointer and key handlers, the `aria-*` attributes and `disabled`.
 */
const MuiDragHandle = ({ style, ...props }: DragHandleSlotProps) => (
  <IconButton size="small" style={{ cursor: props["data-dragging"] === undefined ? "grab" : "grabbing", ...style }} {...props}>
    <DragIndicator fontSize="small" />
  </IconButton>
);

/**
 * MUI checkbox adapter
 *
 * MUI's `Checkbox` has its own `indeterminate` prop and calls
 * `onChange(event, checked)`.
 */
const MuiCheckbox = ({ checked, indeterminate, disabled, onCheckedChange, ...aria }: CheckboxSlotProps) => (
  <Checkbox
    size="small"
    checked={checked}
    indeterminate={indeterminate}
    disabled={disabled}
    onChange={(_, value) => onCheckedChange(value)}
    onClick={(event) => event.stopPropagation()}
    slotProps={{ input: { "aria-label": aria["aria-label"] } }}
  />
);

/**
 * MUI sort icon
 *
 * Arrows in MUI's secondary text color.
 */
const MuiSortIcon = ({ direction }: SortIconSlotProps) => (
  <Box component="span" sx={{ color: "text.secondary", fontSize: 12 }}>
    {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}
  </Box>
);

/**
 * MUI loading
 *
 * root-cms shows one `CircularProgress` instead of skeleton rows; this
 * `Skeleton` slot does the same in the first cell only.
 */
const MuiLoading = ({ rowIndex, columnIndex }: SkeletonSlotProps) =>
  rowIndex === 0 && columnIndex === 0 ? <CircularProgress size={24} /> : null;

/**
 * MUI empty state
 *
 * root-cms's centered secondary `Typography`.
 */
const MuiEmpty = ({ message }: EmptySlotProps) => (
  <Stack alignItems="center" justifyContent="center" spacing={1}>
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Stack>
);

/**
 * MUI error state
 *
 * Message and a retry `Button`.
 */
const MuiError = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <Stack alignItems="center" spacing={1}>
    <Typography color="error">{message}</Typography>
    {onRetry && (
      <Button size="small" onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </Stack>
);

/**
 * MUI pagination
 *
 * root-cms's pair: `Pagination` for the page numbers and a `TablePagination`
 * with its actions blanked out for rows-per-page and the "x–y of n" label.
 */
function MuiPagination({ pageIndex, pageCount, pageSize, pageSizeOptions, rowCount, setPageIndex, setPageSize }: PaginationSlotProps) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" m={1}>
      <Pagination count={pageCount} page={pageIndex + 1} onChange={(_, page) => setPageIndex(page - 1)} />
      <TablePagination
        component="div"
        ActionsComponent={() => <></>}
        count={rowCount}
        page={pageIndex}
        rowsPerPage={pageSize}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={() => {}}
        onRowsPerPageChange={(event) => setPageSize(parseInt(event.target.value, 10))}
      />
    </Stack>
  );
}

/**
 * MUI components
 *
 * The slot map an MUI v7 project (root-cms) would pass as `components`.
 */
export const muiComponents: Partial<DataTableComponents> = {
  Root: MuiRoot,
  Table,
  Head: TableHead,
  Body: TableBody,
  HeaderRow: TableRow,
  Row: MuiRow,
  HeaderCell: TableCell,
  Cell: TableCell,
  Checkbox: MuiCheckbox,
  SortIcon: MuiSortIcon,
  Skeleton: MuiLoading,
  Empty: MuiEmpty,
  Error: MuiError,
  Pagination: MuiPagination,
  DragHandle: MuiDragHandle,
};
