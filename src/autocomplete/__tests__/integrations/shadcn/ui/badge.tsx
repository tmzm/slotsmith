import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Badge variants
 *
 * The looks these slots use. Upstream builds the same set with `cva`.
 */
const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground",
};

/**
 * Badge props
 *
 * Plain span attributes plus the shadcn variant selector.
 */
export type BadgeProps = ComponentProps<"span"> & {
  /** Which look to render. */
  variant?: keyof typeof badgeVariants;
};

/**
 * Badge
 *
 * shadcn's `components/ui/badge.tsx`, the primitive a shadcn project reaches
 * for when a selection has to be shown as a chip.
 *
 * @param props - See {@link BadgeProps}.
 */
function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
