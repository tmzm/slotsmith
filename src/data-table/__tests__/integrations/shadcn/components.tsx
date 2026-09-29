/**
 * DataTable for shadcn/ui
 *
 * A `components` map that renders the slotsmith data table with shadcn/ui
 * primitives, written for shadcn/ui on Tailwind CSS v4. Copy the file, keep
 * the parts you want, and pass the map as `components={shadcnDataTable}`;
 * every slot left out keeps its fallback.
 *
 * The `@/components/ui/*` and `@/lib/utils` imports are the app's own
 * shadcn/ui files.
 */
import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import type {
  CheckboxSlotProps,
  DataTableComponents,
  DragHandleSlotProps,
  EmptySlotProps,
  ErrorSlotProps,
  PaginationSlotProps,
  RowSlotProps,
} from "../../../index";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "./ui/utils";

/**
 * Shadcn checkbox adapter
 *
 * Maps the slot's `indeterminate` flag onto radix's tri-state `checked`, and
 * stops the click from reaching `onRowClick`, like an editorial layout's header row.
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
 * Shadcn row
 *
 * `TableRow` with the drag styles for row reordering. While a row is lifted
 * (`data-dragging`), it and its visible sub-rows (`data-dragging-child`) are
 * drawn above the rows they pass, with opaque cells so those rows never show
 * through, and one shadow under the block. With reduced motion nothing
 * slides: the block is dimmed and a line on `data-drop-edge` shows where it
 * will land.
 */
const ShadcnRow = ({ className, ...props }: RowSlotProps) => (
  <TableRow
    className={cn(
      "data-dragging:relative data-dragging:z-10 data-dragging:shadow-lg data-dragging:*:bg-muted",
      "data-dragging-child:relative data-dragging-child:z-10 data-dragging-child:*:bg-muted",
      "[&[data-dragging]:has(+[data-dragging-child])]:shadow-none [&[data-dragging-child]:not(:has(+[data-dragging-child]))]:shadow-lg",
      "motion-reduce:shadow-none! motion-reduce:data-dragging:*:opacity-50 motion-reduce:data-dragging-child:*:opacity-50",
      "motion-reduce:data-[drop-edge=before]:*:shadow-[inset_0_2px_0_0_var(--primary)] motion-reduce:data-[drop-edge=after]:*:shadow-[inset_0_-2px_0_0_var(--primary)]",
      className,
    )}
    {...props}
  />
);

/**
 * Grip icon
 *
 * lucide's `GripVertical`, drawn inline with the same six dots and the same
 * `lucide lucide-grip-vertical` classes, so the file needs no icon package.
 * A project with `lucide-react` can import `GripVertical` from it instead.
 */
const GripVertical = ({ className, ...props }: ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn("lucide lucide-grip-vertical", className)}
    {...props}
  >
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

/**
 * Shadcn drag handle
 *
 * A ghost icon `Button` with lucide's `GripVertical`. Every slot prop goes
 * to its `<button>`: the ref, the pointer and key handlers, the `aria-*`
 * attributes and `disabled`. shadcn's `Button` sets no `type`, so inside a
 * form it would submit it; `type="button"` comes first, so a slot prop can
 * still override it.
 */
const ShadcnDragHandle = ({ className, ...props }: DragHandleSlotProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={cn("size-7 cursor-grab touch-none text-muted-foreground data-dragging:cursor-grabbing", className)}
    {...props}
  >
    <GripVertical />
  </Button>
);

/**
 * Visible pages
 *
 * an editorial layout's page list: every page up to 4, otherwise the first, the last,
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
 * Modeled on an editorial layout's pagination component: a "Showing …"
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
 * Title and subtitle, like an editorial layout's placeholder block.
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
 * Message and a Retry button, like an editorial layout's error state.
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
 * The slot map a shadcn project styled as an editorial layout would pass as `components`.
 */
export const shadcnDataTable: Partial<DataTableComponents> = {
  Table,
  Head: TableHeader,
  Body: TableBody,
  HeaderRow: TableRow,
  Row: ShadcnRow,
  HeaderCell: TableHead,
  Cell: TableCell,
  Checkbox: ShadcnCheckbox,
  Skeleton: () => <Skeleton className="h-4 w-full" />,
  Empty: ShadcnEmpty,
  Error: ShadcnError,
  Pagination: ShadcnPagination,
  DragHandle: ShadcnDragHandle,
};
