import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Progress props
 *
 * Plain div attributes plus the 0–100 value shadcn's own `Progress`
 * (built on `@radix-ui/react-progress` upstream) takes.
 */
export type ProgressProps = ComponentProps<"div"> & {
  /** 0–100. */
  value?: number;
};

/**
 * Progress
 *
 * shadcn's `components/ui/progress.tsx`. Upstream renders Radix's
 * `Progress.Root` / `Progress.Indicator` and keeps `value` for the indicator
 * only, so the root carries `role="progressbar"`, `aria-valuemin` and
 * `aria-valuemax` but no `aria-valuenow`. This copy does the same by hand, so
 * it stays dependency-free; attributes passed in win, as with Radix.
 *
 * @param props - See {@link ProgressProps}.
 */
function Progress({ className, value, ...props }: ProgressProps) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      data-state="indeterminate"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
}

export { Progress };
