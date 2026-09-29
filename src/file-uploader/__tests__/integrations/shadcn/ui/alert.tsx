import type { ComponentProps } from "react";
import { cn } from "./utils";

/**
 * Alert
 *
 * shadcn's `components/ui/alert.tsx`, in its destructive look. `role="status"`
 * rather than upstream's default `role="alert"`, to match the file uploader's
 * own contract: rejections are announced politely, never assertively.
 *
 * @param props - Plain div attributes.
 */
function Alert({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert"
      role="status"
      className={cn(
        "relative grid w-full grid-cols-[1fr_auto] items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
