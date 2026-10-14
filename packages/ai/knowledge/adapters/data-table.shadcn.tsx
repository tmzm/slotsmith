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
import { useId, type ComponentProps } from "react";
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
  type PaginationSlotProps,
  type RowSlotProps,
} from "slotsmith/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Shadcn checkbox adapter
 *
 * Maps the slot's `indeterminate` flag onto radix's tri-state `checked`, and
 * stops the click from reaching `onRowClick`, so ticking a box never opens
 * the row.
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
 * Shadcn cell
 *
 * `TableCell` with the spreadsheet styles: in spreadsheet mode a body cell
 * carries its part in the selection as `data-*` attributes. The active cell
 * and the one being edited get a ring in the primary colour, the selected
 * range a primary tint, the cells a fill drag would write and the copied
 * ones the muted colour with a thin ring. Read-only cells are muted, and
 * cells cannot be selected as text, except in the editor.
 */
const ShadcnCell = ({ className, ...props }: CellSlotProps) => (
  <TableCell
    className={cn(
      "data-column-id:cursor-cell data-column-id:select-none data-column-id:outline-none data-column-id:scroll-mt-12 [&_input]:select-text",
      "data-selected:bg-primary/10 data-fill-preview:bg-muted data-copied:bg-muted",
      "data-fill-preview:shadow-[inset_0_0_0_1px_var(--ring)] data-copied:shadow-[inset_0_0_0_1px_var(--ring)]",
      "data-active:shadow-[inset_0_0_0_2px_var(--primary)] data-editing:shadow-[inset_0_0_0_2px_var(--primary)] data-editing:bg-background",
      "aria-readonly:text-muted-foreground",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn cell editor
 *
 * Text and numbers are edited in an `Input` with its border and ring taken
 * off, so the cell itself is the field, with the validation message on a
 * destructive chip above the cell. Selects and dates keep the built-in
 * editor, the slotsmith `Autocomplete` and `DatePicker`, which wear the
 * shadcn adapters given to `SlotsmithProvider`.
 */
function ShadcnCellEditor(props: CellEditorSlotProps) {
  const errorId = useId();
  if (props.kind !== "text" && props.kind !== "number") return <fallbackComponents.CellEditor {...props} />;
  const { onValueChange, error } = props;
  return (
    <div className="flex min-w-0 flex-1 items-center px-2">
      <Input
        className="h-auto rounded-none border-0 bg-transparent p-0 text-[length:inherit] shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none dark:bg-transparent"
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
        <span
          id={errorId}
          role="alert"
          className="absolute start-0 bottom-full z-30 mb-0.5 rounded-sm bg-destructive px-2 text-xs whitespace-nowrap text-white"
        >
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Shadcn fill handle
 *
 * A small square in the primary colour inside the selection's corner, so it never overflows the scroll area.
 */
const ShadcnFillHandle = ({ className, ...props }: FillHandleSlotProps) => (
  <span
    className={cn(
      "absolute end-0 bottom-0 z-20 size-[7px] cursor-crosshair touch-none border border-background bg-primary",
      className,
    )}
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
 * A compact page list: every page up to 4, otherwise the first, the last,
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
 * Chevron icons
 *
 * lucide's `ChevronLeft` and `ChevronRight`, drawn inline like the grip, and
 * turned round on right-to-left pages so they point the reading way.
 */
const Chevron = ({ d, className, ...props }: ComponentProps<"svg"> & { d: string }) => (
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
    className={cn("rtl:rotate-180", className)}
    {...props}
  >
    <path d={d} />
  </svg>
);
const ChevronLeft = (props: ComponentProps<"svg">) => <Chevron d="m15 18-6-6 6-6" {...props} className={cn("lucide lucide-chevron-left", props.className)} />;
const ChevronRight = (props: ComponentProps<"svg">) => <Chevron d="m9 18 6-6-6-6" {...props} className={cn("lucide lucide-chevron-right", props.className)} />;

/**
 * Shadcn pagination
 *
 * A compact pagination bar: the page summary, shadcn's `Select` for rows per
 * page, and numbered page `Button`s (the current one in the default variant
 * with `aria-current="page"`, the rest ghost) whose outline previous / next
 * buttons disappear at either end. Every word on it comes from `labels`, so
 * a locale or a custom label reaches it.
 */
function ShadcnPagination({ pageIndex, pageCount, pageSize, pageSizeOptions, setPageIndex, setPageSize, labels }: PaginationSlotProps) {
  const page = pageIndex + 1;
  const rowsPerPageId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-6 px-6 py-4">
      <div className="text-sm text-muted-foreground">{labels.pageInfo(page, pageCount)}</div>
      <div className="flex items-center gap-2">
        <span id={rowsPerPageId} className="text-sm font-medium">
          {labels.rowsPerPage}
        </span>
        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger size="sm" aria-labelledby={rowsPerPageId} className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav role="navigation" aria-label={labels.pagination}>
        <ul className="flex items-center gap-1">
          {page > 1 && (
            <li>
              <Button type="button" variant="outline" size="icon" className="size-8" aria-label={labels.previousPage} onClick={() => setPageIndex(pageIndex - 1)}>
                <ChevronLeft />
              </Button>
            </li>
          )}
          {visiblePages(page, pageCount).map((item, index) => (
            <li key={index}>
              {item === "ellipsis" ? (
                <span aria-hidden="true" className="flex size-8 items-center justify-center text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  type="button"
                  variant={item === page ? "default" : "ghost"}
                  size="icon"
                  className="size-8"
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => setPageIndex(item - 1)}
                >
                  {item}
                </Button>
              )}
            </li>
          ))}
          {page < pageCount && (
            <li>
              <Button type="button" variant="outline" size="icon" className="size-8" aria-label={labels.nextPage} onClick={() => setPageIndex(pageIndex + 1)}>
                <ChevronRight />
              </Button>
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
 * The `labels.empty` message as a centred title.
 */
const ShadcnEmpty = ({ message }: EmptySlotProps) => (
  <div data-slot="empty" className="flex flex-col items-center gap-1 py-10">
    <p className="font-semibold">{message}</p>
  </div>
);

/**
 * Shadcn error state
 *
 * A centred message and a Retry button.
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
 * The slot map a shadcn/ui project would pass as `components`.
 */
export const shadcnDataTable: Partial<DataTableComponents> = {
  Table,
  Head: TableHeader,
  Body: TableBody,
  HeaderRow: TableRow,
  Row: ShadcnRow,
  HeaderCell: TableHead,
  Cell: ShadcnCell,
  Checkbox: ShadcnCheckbox,
  Skeleton: () => <Skeleton className="h-4 w-full" />,
  Empty: ShadcnEmpty,
  Error: ShadcnError,
  Pagination: ShadcnPagination,
  DragHandle: ShadcnDragHandle,
  CellEditor: ShadcnCellEditor,
  FillHandle: ShadcnFillHandle,
};
