import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Input
 *
 * shadcn's `components/ui/input.tsx`.
 *
 * @param props - Plain input attributes.
 */
function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
