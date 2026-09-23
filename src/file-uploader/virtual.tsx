"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";
import {
  FileUploaderProvider,
  FileUploaderRoot,
  splitFileUploaderProps,
  type FileUploaderProps,
  type FileUploaderRootProps,
} from "./FileUploader";
import {
  FileUploaderCompact,
  FileUploaderDropzone,
  FileUploaderItemView,
  FileUploaderRejections,
} from "./parts";
import { useFileUploaderContext } from "./slots/context";

/**
 * Uploader virtual options
 *
 * How the windowed item list measures and renders rows.
 *
 * @example
 * ```tsx
 * <VirtualFileUploader virtual={{ estimateSize: 64, maxHeight: 500 }} multiple upload={upload} />
 * ```
 */
export interface FileUploaderVirtualOptions {
  /** Estimated row height in pixels. Defaults to 56. */
  estimateSize?: number;
  /** Rows rendered beyond the visible area. Defaults to 6. */
  overscan?: number;
  /** Height of the scroll area in pixels. Defaults to 400. */
  maxHeight?: number;
}

/** Height of the scroll area when `virtual.maxHeight` is not set. */
const DEFAULT_MAX_HEIGHT = 400;

/**
 * Spacer
 *
 * An empty row standing in for the items outside the viewport, so the
 * scrollbar reflects the whole list. Hidden from assistive technology,
 * because it is not an item.
 *
 * @param props - The height to occupy.
 */
function Spacer({ height }: { height: number }) {
  if (height <= 0) return null;
  return <li aria-hidden="true" data-slot="virtual-spacer" style={{ height, padding: 0, margin: 0 }} />;
}

/**
 * File uploader virtual list
 *
 * The item list rendering only the rows in view. Every `Item`, `Thumbnail`,
 * `ItemMeta`, `Progress` and `Action` part behaves exactly as it does in the
 * plain list; spacer rows keep the scroll height honest.
 *
 * Use it in place of `FileUploader.List` when a batch runs to hundreds of
 * files, where one row per file would otherwise mean hundreds of live
 * progress bars.
 *
 * Requires the optional peer `@tanstack/react-virtual`.
 *
 * @param props - See {@link FileUploaderVirtualOptions}.
 *
 * @example
 * ```tsx
 * import { FileUploaderVirtualList } from "slotsmith/virtual";
 *
 * <FileUploader.Provider multiple upload={upload}>
 *   <FileUploader.Root>
 *     <FileUploader.Dropzone />
 *     <FileUploaderVirtualList estimateSize={64} />
 *   </FileUploader.Root>
 * </FileUploader.Provider>
 * ```
 */
export function FileUploaderVirtualList({
  estimateSize = 56,
  overscan = 6,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: FileUploaderVirtualOptions = {}) {
  const { components: C, slotProps, items, variant } = useFileUploaderContext();

  /**
   * The scroll element is kept in state, not a ref: the rows render inside it,
   * so a ref object is still empty on the first pass and nothing would be
   * measured until a second render.
   */
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    /** Renders a first screen before the list has been measured. */
    initialRect: { width: 0, height: maxHeight },
  });

  if (variant === "tile" || !items.length) return null;

  const virtualItems = virtualizer.getVirtualItems();
  const before = virtualItems[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0);

  return (
    <C.List
      {...slotProps.list}
      ref={setScrollElement}
      style={{ maxHeight, overflowY: "auto", ...slotProps.list?.style }}
    >
      <Spacer height={before} />
      {virtualItems.map((virtualItem) => (
        <FileUploaderItemView key={items[virtualItem.index]!.id} item={items[virtualItem.index]!} />
      ))}
      <Spacer height={after} />
    </C.List>
  );
}

/**
 * Virtual file uploader props
 *
 * The `<FileUploader>` props plus the windowing options.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export type VirtualFileUploaderProps<TData = unknown> = FileUploaderProps<TData> & {
  /** How rows are measured and rendered. */
  virtual?: FileUploaderVirtualOptions;
};

/**
 * VirtualFileUploader
 *
 * `<FileUploader>` for large batches: only the item rows in view are
 * rendered. Queueing, progress, retry, cancellation and every slot behave
 * identically.
 *
 * Requires the optional peer `@tanstack/react-virtual`.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link VirtualFileUploaderProps}.
 *
 * @example
 * ```tsx
 * import { VirtualFileUploader } from "slotsmith/virtual";
 *
 * <VirtualFileUploader multiple maxFiles={500} upload={upload} virtual={{ estimateSize: 64 }} />;
 * ```
 */
export function VirtualFileUploader<TData = unknown>(props: VirtualFileUploaderProps<TData>) {
  const { providerProps, rest } = splitFileUploaderProps<TData, VirtualFileUploaderProps<TData>>(props);
  const { virtual = {}, hideList, children, className, ...htmlProps } = rest as Record<string, never> &
    VirtualFileUploaderProps<TData>;

  return (
    <FileUploaderProvider<TData> {...providerProps}>
      <FileUploaderRoot className={className} {...(htmlProps as FileUploaderRootProps)}>
        <FileUploaderDropzone>{children}</FileUploaderDropzone>
        <FileUploaderCompact />
        {hideList ? null : <FileUploaderVirtualList {...virtual} />}
        <FileUploaderRejections />
      </FileUploaderRoot>
    </FileUploaderProvider>
  );
}
