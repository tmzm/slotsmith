import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Pagination
 *
 * shadcn's `components/ui/pagination.tsx`: the parts these slots use. The
 * page controls are `Button`s rather than shadcn's `PaginationLink`, an
 * `<a>`, because the table changes page in place instead of following a link.
 *
 * @param props - Plain nav attributes.
 */
function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

/**
 * Pagination content
 *
 * @param props - Plain list attributes.
 */
function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

/**
 * Pagination item
 *
 * @param props - Plain list item attributes.
 */
function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

/**
 * Pagination ellipsis
 *
 * The gap between page numbers, hidden from assistive technology.
 *
 * @param props - Plain span attributes.
 */
function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="pagination-ellipsis" className={cn("flex size-9 items-center justify-center", className)} {...props}>
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
      <span className="sr-only">More pages</span>
    </span>
  );
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem };
