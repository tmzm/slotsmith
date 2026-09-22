import { Select as SelectPrimitive } from "radix-ui";
import type {
  CheckboxSlotProps,
  DataTableComponents,
  EmptySlotProps,
  ErrorSlotProps,
  PaginationSlotProps,
} from "../../../index";
import { Checkbox } from "./ui/checkbox";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "./ui/utils";

/**
 * Shadcn checkbox adapter
 *
 * Maps the slot's `indeterminate` flag onto radix's tri-state `checked`, and
 * stops the click from reaching `onRowClick`, like meliving's header.tsx.
 */
const ShadcnCheckbox = ({ checked, indeterminate, onCheckedChange, ...props }: CheckboxSlotProps) => (
  <Checkbox
    checked={indeterminate ? "indeterminate" : checked}
    onCheckedChange={(value) => onCheckedChange(value === true)}
    onClick={(event) => event.stopPropagation()}
    {...props}
  />
);

/**
 * Visible pages
 *
 * meliving's page list: every page up to 4, otherwise the first, the last,
 * and the neighbours of the current page with ellipses between.
 *
 * @param page - The current page, 1-based.
 * @param total - The page count.
 * @returns Page numbers and `"ellipsis"` markers.
 */
function visiblePages(page: number, total: number): (number | "ellipsis")[] {
  if (total <= 4) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [...new Set([1, page - 1, page, page + 1, total])].filter((p) => p >= 1 && p <= total);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1]! > 1 ? ["ellipsis" as const, p] : [p]));
}

/**
 * Shadcn pagination
 *
 * Modeled on meliving's components/shared/pagination.tsx: a "Showing …"
 * summary, a radix rows-per-page select, and numbered page buttons whose
 * previous / next buttons disappear at either end.
 */
function ShadcnPagination({
  pageIndex,
  pageCount,
  pageSize,
  pageSizeOptions,
  rowCount,
  setPageIndex,
  setPageSize,
}: PaginationSlotProps) {
  const page = pageIndex + 1;
  const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(rowCount, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6 px-6 py-4">
      <div className="text-sm text-font-body">
        Showing {from} to {to} of {rowCount} records
      </div>
      <div className="flex items-center gap-2">
        <span id="rows-per-page" className="text-sm text-font-body">
          Rows per page:
        </span>
        <SelectPrimitive.Root value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectPrimitive.Trigger aria-labelledby="rows-per-page" className="h-8 min-w-14">
            <SelectPrimitive.Value />
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content position="popper">
              <SelectPrimitive.Viewport>
                {pageSizeOptions.map((size) => (
                  <SelectPrimitive.Item key={size} value={String(size)}>
                    <SelectPrimitive.ItemText>{size}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
      <nav role="navigation" aria-label="pagination">
        <ul className="flex items-center gap-2">
          {page > 1 && (
            <li>
              <button type="button" aria-label="Previous page" onClick={() => setPageIndex(pageIndex - 1)}>
                ‹
              </button>
            </li>
          )}
          {visiblePages(page, pageCount).map((item, index) => (
            <li key={index}>
              {item === "ellipsis" ? (
                <span>…</span>
              ) : (
                <button
                  type="button"
                  disabled={item === page}
                  aria-current={item === page ? "page" : undefined}
                  className={cn("rounded-md border", item === page && "bg-primary")}
                  onClick={() => setPageIndex(item - 1)}
                >
                  {item}
                </button>
              )}
            </li>
          ))}
          {page < pageCount && (
            <li>
              <button type="button" aria-label="Next page" onClick={() => setPageIndex(pageIndex + 1)}>
                ›
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}

/**
 * Shadcn empty state
 *
 * Title and subtitle, like meliving's `Placeholder`.
 */
const ShadcnEmpty = ({ message }: EmptySlotProps) => (
  <div data-slot="empty" className="flex flex-col items-center gap-1 py-10">
    <p className="font-semibold">{message}</p>
    <p className="text-sm text-muted-foreground">There&apos;s no data to show</p>
  </div>
);

/**
 * Shadcn error state
 *
 * Message and a Retry button, like meliving's error-body.tsx.
 */
const ShadcnError = ({ message, retryLabel, onRetry }: ErrorSlotProps) => (
  <div data-slot="error" className="flex flex-col items-center gap-2 py-10">
    <p className="font-semibold">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry}>
        {retryLabel}
      </button>
    )}
  </div>
);

/**
 * Shadcn components
 *
 * The slot map a shadcn project (meliving) would pass as `components`.
 */
export const shadcnComponents: Partial<DataTableComponents> = {
  Table,
  Head: TableHeader,
  Body: TableBody,
  HeaderRow: TableRow,
  Row: TableRow,
  HeaderCell: TableHead,
  Cell: TableCell,
  Checkbox: ShadcnCheckbox,
  Skeleton: () => <Skeleton className="h-4 w-full" />,
  Empty: ShadcnEmpty,
  Error: ShadcnError,
  Pagination: ShadcnPagination,
};
