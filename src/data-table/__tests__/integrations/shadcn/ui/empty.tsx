import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Empty
 *
 * shadcn's `components/ui/empty.tsx`: the parts these slots use.
 *
 * @param props - Plain div attributes.
 */
function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Empty header
 *
 * @param props - Plain div attributes.
 */
function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-2 text-center", className)} {...props} />;
}

/**
 * Empty title
 *
 * @param props - Plain div attributes.
 */
function EmptyTitle({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="empty-title" className={cn("text-lg font-medium tracking-tight", className)} {...props} />;
}

/**
 * Empty content
 *
 * @param props - Plain div attributes.
 */
function EmptyContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="empty-content" className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", className)} {...props} />
  );
}

export { Empty, EmptyContent, EmptyHeader, EmptyTitle };
