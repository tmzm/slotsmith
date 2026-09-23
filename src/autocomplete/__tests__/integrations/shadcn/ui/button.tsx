import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Button variants
 *
 * The looks these slots use. Upstream builds the same set with `cva`; a plain
 * record keeps this copy dependency-free.
 */
const buttonVariants = {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

/**
 * Button sizes
 *
 * The sizes these slots use.
 */
const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 gap-1.5 rounded-md px-3",
  icon: "size-6 rounded-sm",
};

/**
 * Button props
 *
 * Plain button attributes plus the two shadcn selectors.
 */
export type ButtonProps = ComponentProps<"button"> & {
  /** Which look to render. */
  variant?: keyof typeof buttonVariants;
  /** Which size to render. */
  size?: keyof typeof buttonSizes;
};

/**
 * Button
 *
 * shadcn's `components/ui/button.tsx`.
 *
 * @param props - See {@link ButtonProps}.
 */
function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export { Button };
