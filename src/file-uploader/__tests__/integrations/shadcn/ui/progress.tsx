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
 * shadcn's `components/ui/progress.tsx`. Upstream renders this from Radix's
 * `Progress.Root` / `Progress.Indicator`, which already carry
 * `role="progressbar"` and `aria-valuenow`; this copy sets them by hand so it
 * stays dependency-free.
 *
 * @param props - See {@link ProgressProps}.
 */
function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full flex-1 rounded-full bg-primary transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
