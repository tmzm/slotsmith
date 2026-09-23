"use client";

import { useMemo, type HTMLAttributes, type ReactNode } from "react";
import type { UploadItem } from "./core/types";
import {
  useFileUploader,
  type FileUploaderModel,
  type UseFileUploaderOptions,
} from "./core/useFileUploader";
import { formatBytes, isImage } from "./core/validate";
import {
  defaultFileUploaderLabels,
  fileUploaderFallbacks,
  formatItemSize,
} from "./slots/fallbacks";
import type {
  FileUploaderComponents,
  FileUploaderLabels,
  FileUploaderSlotProps,
} from "./slots/types";

/**
 * Variant
 *
 * How the component is laid out:
 *
 * - `dropzone` — a drop area with the items listed under it. The default.
 * - `tile` — one square whose preview replaces the drop zone. For avatars and
 *   single images.
 * - `compact` — a button and an inline list, for tight forms and toolbars.
 */
export type FileUploaderVariant = "dropzone" | "tile" | "compact";

/**
 * File uploader props
 *
 * The hook's options, plus how it renders.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderProps<TData = unknown>
  extends UseFileUploaderOptions<TData>,
    Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onError" | "defaultValue"> {
  variant?: FileUploaderVariant;
  /** Replace any part; the rest stay as fallbacks. */
  components?: Partial<FileUploaderComponents>;
  /** Override any text. */
  labels?: Partial<FileUploaderLabels>;
  /** Extra DOM props for the element parts. */
  slotProps?: FileUploaderSlotProps;
  /** Hide the item list, e.g. when you render the files yourself. */
  hideList?: boolean;
  /** Rendered inside the drop zone, under the title. */
  children?: ReactNode;
}

const OPTION_KEYS = [
  "accept", "maxSize", "minSize", "maxFiles", "validate", "multiple", "disabled",
  "value", "onValueChange", "defaultValue", "onFilesChange", "onUrlsChange",
  "upload", "autoUpload", "concurrency", "onUploaded", "onUploadError", "onReject",
  "preview", "validationLabels", "captureWindowDrops",
] as const;

/** Compile-time guard: every hook option must be routed to the hook. */
type MissingOptionKeys = Exclude<keyof UseFileUploaderOptions, (typeof OPTION_KEYS)[number]>;
const _allOptionsListed: [MissingOptionKeys] extends [never] ? true : MissingOptionKeys = true;
void _allOptionsListed;

const optionKeys = new Set<string>(OPTION_KEYS);

/**
 * Split props
 *
 * Separates the hook's options from the DOM props, so anything else lands on
 * the root element.
 */
function splitProps<TData>(props: FileUploaderProps<TData>) {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (optionKeys.has(key) ? options : rest)[key] = value;
  }
  return {
    options: options as UseFileUploaderOptions<TData>,
    rest: rest as Omit<FileUploaderProps<TData>, keyof UseFileUploaderOptions<TData>>,
  };
}

/**
 * FileUploader
 *
 * A headless-first file uploader. Drop or browse, validate, preview, upload
 * with progress and retry — or omit `upload` and it never touches the network,
 * handing you the files instead.
 *
 * Every part is replaceable through `components`, every string through
 * `labels`, and the fallbacks are plain accessible HTML.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link FileUploaderProps}.
 *
 * @example
 * ```tsx
 * // Picker: no upload, the files are yours.
 * <FileUploader accept=".csv,.xlsx" onFilesChange={([file]) => setSheet(file)} />
 *
 * // Uploader: queued, with progress and retry.
 * <FileUploader multiple upload={uploadToApi} onUrlsChange={field.onChange} />
 *
 * // Image: the preview replaces the drop zone.
 * <FileUploader variant="tile" accept="image/*" upload={uploadToApi} />
 * ```
 */
export function FileUploader<TData = unknown>(props: FileUploaderProps<TData>) {
  const { options, rest } = splitProps(props);
  const {
    variant = "dropzone",
    components,
    labels: labelOverrides,
    slotProps = {},
    hideList = false,
    children,
    className,
    ...htmlProps
  } = rest;

  const uploader = useFileUploader<TData>(options);
  const C = useMemo(
    () => ({ ...fileUploaderFallbacks, ...withoutUndefined(components) }),
    [components],
  );
  const labels = useMemo(
    () => ({ ...defaultFileUploaderLabels, ...withoutUndefined(labelOverrides) }),
    [labelOverrides],
  );

  const { items, isDragging, disabled, dropzoneProps, inputProps } = uploader;
  const tile = variant === "tile";
  const showZone = variant !== "compact";
  /** In tile mode the newest item *is* the zone's content. */
  const tileItem = tile ? items[items.length - 1] : undefined;

  const hint = labels.hint({
    accept: uploader.accept,
    maxSize: options.maxSize ? formatBytes(options.maxSize) : undefined,
    maxFiles: options.maxFiles ?? (options.multiple ? undefined : 1),
  });

  const renderActions = (item: UploadItem<TData>) => (
    <span className="sfu__actions">
      {item.status === "uploading" && (
        <C.Action action="cancel" onClick={() => uploader.cancel(item.id)} aria-label={labels.cancel} />
      )}
      {item.status === "error" && item.file && (
        <C.Action action="retry" onClick={() => uploader.retry(item.id)} aria-label={labels.retry} />
      )}
      <C.Action
        action="remove"
        onClick={() => uploader.remove(item.id)}
        disabled={disabled}
        aria-label={labels.remove}
      />
    </span>
  );

  const statusLabel = (item: UploadItem<TData>) =>
    item.status === "uploading"
      ? labels.uploading
      : item.status === "done"
        ? labels.done
        : item.status === "error"
          ? labels.failed
          : uploader.uploadable
            ? labels.ready
            : "";

  return (
    <C.Root
      className={className}
      data-variant={variant}
      data-dragging={isDragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-empty={items.length ? undefined : ""}
      {...mergeSlot(slotProps.root, htmlProps)}
    >
      {showZone && (
        <C.Dropzone
          aria-label={labels.dropzone}
          {...dropzoneProps}
          {...slotProps.dropzone}
          className={slotProps.dropzone?.className}
        >
          <C.Input {...inputProps} aria-label={labels.dropzone} />

          {tile && tileItem ? (
            <>
              <C.Thumbnail
                item={tileItem}
                src={tileItem.previewUrl ?? tileItem.url}
                isImage={isImage(tileItem.type) || !!tileItem.previewUrl}
                alt={labels.preview(tileItem.name)}
              />
              {tileItem.status === "uploading" && (
                <C.Progress
                  value={tileItem.progress}
                  active
                  aria-label={labels.progress(tileItem.name)}
                />
              )}
              {tileItem.status === "error" && <span className="sfu__error">{tileItem.error}</span>}
              {renderActions(tileItem)}
            </>
          ) : (
            <>
              <C.Icon dragging={isDragging} />
              <C.Empty title={isDragging ? labels.dropHere : labels.title} hint={hint} dragging={isDragging} />
              <C.Trigger onClick={uploader.open} disabled={disabled}>
                {labels.browse}
              </C.Trigger>
            </>
          )}
          {children}
        </C.Dropzone>
      )}

      {variant === "compact" && (
        <span className="sfu__compact">
          <C.Input {...inputProps} aria-label={labels.dropzone} />
          <C.Trigger onClick={uploader.open} disabled={disabled}>
            {labels.browse}
          </C.Trigger>
          <span className="sfu__hint">{hint}</span>
        </span>
      )}

      {!hideList && !tile && !!items.length && (
        <C.List {...slotProps.list}>
          {items.map((item) => (
            <C.Item
              key={item.id}
              data-status={item.status}
              data-image={isImage(item.type) || undefined}
              {...slotProps.item?.(item)}
            >
              <C.Thumbnail
                item={item}
                src={item.previewUrl ?? item.url}
                isImage={isImage(item.type) || !!item.previewUrl}
                alt={labels.preview(item.name)}
              />
              <C.ItemMeta item={item} size={formatItemSize(item.size)} status={statusLabel(item)} />
              {item.status === "uploading" && (
                <C.Progress
                  value={item.progress}
                  active={item.status === "uploading"}
                  aria-label={labels.progress(item.name)}
                />
              )}
              {renderActions(item)}
            </C.Item>
          ))}
        </C.List>
      )}

      {!!uploader.rejections.length && (
        <C.Rejections
          rejections={uploader.rejections}
          onDismiss={uploader.clearRejections}
          dismissLabel={labels.dismiss}
        />
      )}
    </C.Root>
  );
}

/**
 * Without undefined
 *
 * Drops `undefined` entries, so `{ Icon: undefined }` keeps the fallback.
 */
function withoutUndefined<O extends object>(object: O | undefined): Partial<O> {
  return Object.fromEntries(
    Object.entries(object ?? {}).filter(([, value]) => value !== undefined),
  ) as Partial<O>;
}

/**
 * Merge slot
 *
 * Joins the root's slot props with the DOM props passed to the component.
 */
function mergeSlot(slot: HTMLAttributes<HTMLDivElement> | undefined, html: HTMLAttributes<HTMLDivElement>) {
  if (!slot) return html;
  return {
    ...slot,
    ...html,
    className: [slot.className, html.className].filter(Boolean).join(" ") || undefined,
    style: slot.style || html.style ? { ...slot.style, ...html.style } : undefined,
  };
}

export type { FileUploaderModel };
