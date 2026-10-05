import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Alert props
 *
 * Plain div attributes plus upstream's `variant`.
 */
export type AlertProps = ComponentProps<"div"> & {
  /** Upstream's look: card colours, or destructive text. */
  variant?: "default" | "destructive";
};

/**
 * Alert
 *
 * shadcn's `components/ui/alert.tsx` (new-york, Tailwind v4), without
 * `class-variance-authority`. Like upstream it is `role="alert"`, and its grid
 * has two real columns only when the first child is an `<svg>` icon; without
 * one the first column is 0 wide.
 *
 * @param props - See {@link AlertProps}.
 */
function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
        variant === "destructive" ? "bg-card text-destructive [&>svg]:text-current" : "bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
