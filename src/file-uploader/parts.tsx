"use client";

import type { CSSProperties, ReactNode } from "react";
import type { UploadItem } from "./core/types";
import { isImage } from "./core/validate";
import { UploadItemContext, useFileUploaderContext } from "./slots/context";
import { formatItemSize } from "./slots/fallbacks";
import { classes } from "./classes";

/**
 * Merge props
 *
 * Combines the props a part sets itself with the ones a caller passed through
 * `slotProps`: class names are joined, styles are merged, and event handlers
 * are chained so neither is lost.
 *
 * Keys whose value is `undefined` are dropped, so passing
 * `{ className: undefined }` leaves a replacement component's own class intact
 * instead of erasing it.
 *
 * @param base - What the part sets.
 * @param extra - What the caller passed.
 * @returns The merged props.
 *
 * @example
 * ```tsx
 * <C.Item {...mergeProps({ "data-status": item.status }, slotProps.item?.(item))} />
 * ```
 */
export function mergeProps<A extends Record<string, any>, B extends Record<string, any> | undefined>(
  base: A,
  extra: B,
): A & NonNullable<B> {
  if (!extra) return base as A & NonNullable<B>;

  const merged: Record<string, any> = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) continue;

    const current = merged[key];
    if (key === "className") {
      merged[key] = [current, value].filter(Boolean).join(" ") || undefined;
    } else if (key === "style") {
      merged[key] = { ...(current as CSSProperties), ...(value as CSSProperties) };
    } else if (key.startsWith("on") && typeof current === "function" && typeof value === "function") {
      merged[key] = (...args: unknown[]) => {
        current(...args);
        value(...args);
      };
    } else {
      merged[key] = value;
    }
  }

  return merged as A & NonNullable<B>;
}

/**
 * Actions props
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderActionsProps<TData = unknown> {
  /** The item the actions act on. */
  item: UploadItem<TData>;
}

/**
 * FileUploader.Actions
 *
 * One item's controls: cancel while it uploads, retry after it failed, and
 * remove at any time — each an `Action` slot, so one button component covers
 * all three.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link FileUploaderActionsProps}.
 *
 * @example
 * ```tsx
 * <li>
 *   <span>{item.name}</span>
 *   <FileUploader.Actions item={item} />
 * </li>
 * ```
 */
export function FileUploaderActions<TData = unknown>({ item }: FileUploaderActionsProps<TData>) {
  const { components: C, labels, disabled, cancel, retry, remove } = useFileUploaderContext<TData>();

  return (
    <span className={classes.actions}>
      {item.status === "uploading" && (
        <C.Action action="cancel" onClick={() => cancel(item.id)} aria-label={labels.cancel} />
      )}
      {item.status === "error" && item.file && (
        <C.Action action="retry" onClick={() => retry(item.id)} aria-label={labels.retry} />
      )}
      <C.Action
        action="remove"
        onClick={() => remove(item.id)}
        disabled={disabled}
        aria-label={labels.remove}
      />
    </span>
  );
}

/**
 * Item view props
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderItemViewProps<TData = unknown> {
  /** The item to render. */
  item: UploadItem<TData>;
}

/**
 * FileUploader.Item
 *
 * One file row: the `Item` slot holding its `Thumbnail`, `ItemMeta`, the
 * `Progress` bar while it uploads, and its actions. Provides the item to
 * `useUploadItem()`, so a replacement `Item` can read it.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link FileUploaderItemViewProps}.
 *
 * @example
 * ```tsx
 * // A list that shows failures first.
 * function SortedList() {
 *   const { items } = useFileUploaderContext();
 *   const failed = items.filter((item) => item.status === "error");
 *   const rest = items.filter((item) => item.status !== "error");
 *   return <ul>{[...failed, ...rest].map((item) => <FileUploader.Item key={item.id} item={item} />)}</ul>;
 * }
 * ```
 */
export function FileUploaderItemView<TData = unknown>({ item }: FileUploaderItemViewProps<TData>) {
  const { components: C, labels, slotProps, statusLabel, locale } = useFileUploaderContext<TData>();

  return (
    <UploadItemContext.Provider value={item as UploadItem<any>}>
      <C.Item
        {...mergeProps(
          { "data-status": item.status, "data-image": isImage(item.type) || undefined },
          slotProps.item?.(item),
        )}
      >
        <C.Thumbnail
          item={item}
          src={item.previewUrl ?? item.url}
          isImage={isImage(item.type) || !!item.previewUrl}
          alt={labels.preview(item.name)}
        />
        <C.ItemMeta item={item} size={formatItemSize(item.size, locale)} status={statusLabel(item)} />
        {item.status === "uploading" && (
          <C.Progress
            value={item.progress}
            active={item.status === "uploading"}
            aria-label={labels.progress(item.name)}
          />
        )}
        <FileUploaderActions item={item} />
      </C.Item>
    </UploadItemContext.Provider>
  );
}

/**
 * FileUploader.List
 *
 * The `List` slot with a {@link FileUploaderItemView} per item. Renders
 * nothing when there is nothing to list, or in `tile` mode, where the drop
 * zone itself shows the file.
 *
 * @example
 * ```tsx
 * <FileUploader.Provider multiple upload={uploadToApi}>
 *   <FileUploader.Root>
 *     <FileUploader.List />
 *     <FileUploader.Dropzone />
 *   </FileUploader.Root>
 * </FileUploader.Provider>
 * ```
 */
export function FileUploaderList() {
  const { components: C, slotProps, items, variant } = useFileUploaderContext();
  if (variant === "tile" || !items.length) return null;

  return (
    <C.List {...slotProps.list}>
      {items.map((item) => (
        <FileUploaderItemView key={item.id} item={item} />
      ))}
    </C.List>
  );
}

/**
 * Dropzone props
 */
export interface FileUploaderDropzoneProps {
  /** Rendered inside the zone, after its own content. */
  children?: ReactNode;
}

/**
 * FileUploader.Dropzone
 *
 * The drop target: the `Dropzone` slot with the real file input inside it, and
 * either the `tile` preview or the resting icon, copy and browse button.
 * Renders nothing in `compact` mode, which has no zone.
 *
 * @param props - See {@link FileUploaderDropzoneProps}.
 *
 * @example
 * ```tsx
 * <FileUploader.Dropzone>
 *   <p>PNG or JPEG, portrait works best.</p>
 * </FileUploader.Dropzone>
 * ```
 */
export function FileUploaderDropzone({ children }: FileUploaderDropzoneProps) {
  const {
    components: C,
    labels,
    slotProps,
    variant,
    hint,
    tileItem,
    isDragging,
    disabled,
    open,
    dropzoneProps,
    inputProps,
  } = useFileUploaderContext();

  if (variant === "compact") return null;

  return (
    <C.Dropzone
      aria-label={labels.dropzone}
      {...dropzoneProps}
      {...slotProps.dropzone}
      className={slotProps.dropzone?.className}
    >
      <C.Input {...inputProps} aria-label={labels.dropzone} />

      {tileItem ? (
        <>
          <C.Thumbnail
            item={tileItem}
            src={tileItem.previewUrl ?? tileItem.url}
            isImage={isImage(tileItem.type) || !!tileItem.previewUrl}
            alt={labels.preview(tileItem.name)}
          />
          {tileItem.status === "uploading" && (
            <C.Progress value={tileItem.progress} active aria-label={labels.progress(tileItem.name)} />
          )}
          {tileItem.status === "error" && <span className={classes.error}>{tileItem.error}</span>}
          <FileUploaderActions item={tileItem} />
        </>
      ) : (
        <>
          <C.Icon dragging={isDragging} />
          <C.Empty title={isDragging ? labels.dropHere : labels.title} hint={hint} dragging={isDragging} />
          <C.Trigger onClick={open} disabled={disabled}>
            {labels.browse}
          </C.Trigger>
        </>
      )}
      {children}
    </C.Dropzone>
  );
}

/**
 * FileUploader.Compact
 *
 * The `compact` variant's inline row: the hidden input, the browse button and
 * the hint, for tight forms and toolbars. Renders nothing in the other
 * variants, which open the dialog from the zone instead.
 *
 * @example
 * ```tsx
 * <FileUploader.Provider variant="compact" accept=".pdf">
 *   <FileUploader.Root>
 *     <FileUploader.Compact />
 *     <FileUploader.List />
 *   </FileUploader.Root>
 * </FileUploader.Provider>
 * ```
 */
export function FileUploaderCompact() {
  const { components: C, labels, variant, hint, disabled, open, inputProps } = useFileUploaderContext();
  if (variant !== "compact") return null;

  return (
    <span className={classes.compact}>
      <C.Input {...inputProps} aria-label={labels.dropzone} />
      <C.Trigger onClick={open} disabled={disabled}>
        {labels.browse}
      </C.Trigger>
      <span className={classes.hint}>{hint}</span>
    </span>
  );
}

/**
 * FileUploader.Rejections
 *
 * The `Rejections` slot: the files the constraints turned away, with the
 * control that clears them. Renders nothing while nothing was refused.
 *
 * @example
 * ```tsx
 * <FileUploader.Root>
 *   <FileUploader.Rejections />
 *   <FileUploader.Dropzone />
 * </FileUploader.Root>
 * ```
 */
export function FileUploaderRejections() {
  const { components: C, labels, rejections, clearRejections } = useFileUploaderContext();
  if (!rejections.length) return null;

  return (
    <C.Rejections
      rejections={rejections}
      onDismiss={clearRejections}
      dismissLabel={labels.dismiss}
    />
  );
}
