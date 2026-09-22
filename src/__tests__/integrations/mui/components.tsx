import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type {
  CheckboxSlotProps,
  DataTableComponents,
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
 * MUI row
 *
 * `TableRow`, with the slot's `data-state="selected"` mapped onto MUI's
 * `selected` prop so the row gets `Mui-selected` styling.
 */
const MuiRow = (props: RowSlotProps) => (
  <TableRow hover selected={props["data-state" as keyof RowSlotProps] === "selected"} {...props} />
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
};
