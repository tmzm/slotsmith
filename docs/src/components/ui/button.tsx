import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Button variants
 *
 * The classes of shadcn/ui's `buttonVariants` for the variants and sizes
 * these tests use, without class-variance-authority.
 */
const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
}

const sizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  icon: "size-9",
}

/**
 * Button
 *
 * shadcn/ui's `Button`: a plain `<button>` that takes every native prop,
 * including `ref`, and marks itself with `data-slot`, `data-variant` and
 * `data-size`.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
