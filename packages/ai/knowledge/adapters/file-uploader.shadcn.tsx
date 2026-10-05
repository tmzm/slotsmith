/**
 * FileUploader for shadcn/ui
 *
 * A `components` map that renders the slotsmith file uploader with shadcn/ui
 * primitives, written for shadcn/ui on Tailwind CSS v4. Copy the file, keep
 * the parts you want, and pass the map as `components={shadcnFileUploader}`;
 * every slot left out keeps its fallback.
 *
 * The `@/components/ui/*` and `@/lib/utils` imports are the app's own
 * shadcn/ui files.
 */
import { useState } from "react";
import type {
  DropzoneSlotProps,
  FileUploaderComponents,
  ItemMetaSlotProps,
  RejectionsSlotProps,
  ThumbnailSlotProps,
  UploaderActionSlotProps,
  UploaderEmptySlotProps,
  UploaderIconSlotProps,
  UploaderItemSlotProps,
  UploaderListSlotProps,
  UploaderProgressSlotProps,
  UploaderRootSlotProps,
  UploaderTriggerSlotProps,
} from "slotsmith/file-uploader";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Shadcn file uploader parts
 *
 * Built from shadcn/ui primitives — `Button`, `Avatar`, `Progress`, `Alert` —
 * not from a shadcn upload block, which is a copy-in recipe rather than a
 * shared primitive.
 *
 * shadcn's `Button` sets no `type`, so inside a form it would submit it;
 * every `Button` here passes `type="button"`.
 */

/** Stands in for `lucide-react`'s Upload icon. */
const UploadIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

/** Stands in for `lucide-react`'s File icon. */
const FileIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
  </svg>
);

/** Stands in for `lucide-react`'s X icon. */
const X = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/** Stands in for `lucide-react`'s CircleAlert icon. */
const CircleAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

/** Stands in for `lucide-react`'s RotateCw icon. */
const RotateCw = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
  </svg>
);

/** Stands in for `lucide-react`'s Square icon (used for cancel). */
const Square = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-3" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

/**
 * Shadcn dropzone
 *
 * The drop target, styled off the `data-*` attributes the part already
 * carries — no state of its own.
 */
const ShadcnDropzone = ({ className, ...props }: DropzoneSlotProps) => (
  <div
    data-slot="dropzone"
    className={cn(
      "flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
      "hover:border-primary hover:bg-accent/50",
      "data-[dragging]:border-primary data-[dragging]:bg-accent",
      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn item
 *
 * The `<li>` for one file, laid out as a grid so the progress bar can span it.
 */
const ShadcnItem = ({ className, ...props }: UploaderItemSlotProps) => (
  <li
    data-slot="file-item"
    className={cn(
      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b py-2 last:border-b-0",
      "data-[status=error]:border-destructive/50",
      className,
    )}
    {...props}
  />
);

/**
 * Shadcn thumbnail
 *
 * An `Avatar` holding the preview, or a file glyph in its fallback.
 */
const ShadcnThumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) => {
  const [broken, setBroken] = useState(false);
  const showImage = isImage && !!src && !broken;
  return (
    <Avatar className="rounded-md">
      {showImage && <AvatarImage src={src} alt={alt} onError={() => setBroken(true)} />}
      {!showImage && (
        <AvatarFallback>
          <FileIcon className="size-4" />
        </AvatarFallback>
      )}
    </Avatar>
  );
};

/**
 * Shadcn item meta
 *
 * Name over a secondary line, truncated instead of wrapped.
 */
const ShadcnItemMeta = ({ item, size, status }: ItemMetaSlotProps) => (
  <div className="min-w-0">
    <p className="truncate text-sm">{item.name}</p>
    <p className={cn("truncate text-xs", item.status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {item.status === "error" ? item.error : [size, status].filter(Boolean).join(" · ")}
    </p>
  </div>
);

/**
 * Shadcn progress
 *
 * The `Progress` primitive, spanning the row. shadcn's `Progress` keeps
 * `value` for its indicator and never hands it to Radix's root, so the bar
 * sets its own `aria-valuenow` for assistive technology.
 */
const ShadcnProgress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <Progress
    value={value}
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    data-active={active || undefined}
    className="col-span-full"
    {...aria}
  />
);

/**
 * Shadcn action
 *
 * One ghost icon `Button` for remove, retry and cancel.
 */
const ShadcnAction = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    {action === "remove" ? <X /> : action === "retry" ? <RotateCw /> : <Square />}
  </Button>
);

/**
 * Shadcn rejections
 *
 * A destructive `Alert` led by an icon, which gives its grid two real columns;
 * the messages and the Dismiss button share the second, with Dismiss at the
 * inline end. The role is `status` with `aria-live="polite"` rather than
 * shadcn's `alert`, to match the uploader's contract: refusals are announced
 * politely, never assertively.
 */
const ShadcnRejections = ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
  <Alert variant="destructive" role="status" aria-live="polite">
    <CircleAlert />
    <div className="flex items-start gap-2">
      <ul className="min-w-0 flex-1 space-y-0.5">
        {rejections.map((rejection, index) => (
          <li key={`${rejection.file.name}-${index}`}>{rejection.message}</li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-my-1.5 -me-2 size-7 shrink-0"
        aria-label={dismissLabel}
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  </Alert>
);

/**
 * Shadcn components
 *
 * The slot map a shadcn/ui project would pass as `components`.
 */
export const shadcnFileUploader: Partial<FileUploaderComponents> = {
  Root: ({ className, ...props }: UploaderRootSlotProps) => (
    <div data-slot="file-uploader" className={cn("flex flex-col gap-3", className)} {...props} />
  ),
  Dropzone: ShadcnDropzone,
  Icon: ({ dragging }: UploaderIconSlotProps) => (
    <UploadIcon className={cn("size-6", dragging ? "text-primary" : "text-muted-foreground")} />
  ),
  Empty: ({ title, hint }: UploaderEmptySlotProps) => (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  ),
  Trigger: ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  ),
  List: ({ className, ...props }: UploaderListSlotProps) => (
    <ul data-slot="file-list" className={cn("flex flex-col", className)} {...props} />
  ),
  Item: ShadcnItem,
  Thumbnail: ShadcnThumbnail,
  ItemMeta: ShadcnItemMeta,
  Progress: ShadcnProgress,
  Action: ShadcnAction,
  Rejections: ShadcnRejections,
};
