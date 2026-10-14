"use client";

import { useState } from "react";
import type { UseVirtualizer } from "../shared/virtualizer";
import { FileUploaderItemView } from "./parts";
import { useFileUploaderContext } from "./slots/context";

/**
 * Uploader virtual options
 *
 * How the windowed item list measures and renders rows.
 *
 * @example
 * ```tsx
 * import { useVirtualizer } from "@tanstack/react-virtual";
 *
 * <FileUploader multiple upload={upload} virtual={{ use: useVirtualizer, estimateSize: 64, maxHeight: 500 }} />
 * ```
 */
export interface FileUploaderVirtualOptions {
  /** The virtualizer hook: `useVirtualizer` from `@tanstack/react-virtual`. */
  use: UseVirtualizer;
  /** Estimated row height in pixels, with the gap between rows included. Defaults to 56. */
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
 * because it is not an item. It never shrinks, so a flex list capped by
 * `maxHeight`, like the fallback one, cannot collapse it.
 *
 * @param props - The height to occupy.
 */
function Spacer({ height }: { height: number }) {
  if (height <= 0) return null;
  return <li aria-hidden="true" data-slot="virtual-spacer" style={{ height, flexShrink: 0, padding: 0, margin: 0 }} />;
}

/**
 * Row gap
 *
 * @param element - The scroll element, once mounted.
 * @returns The gap a flex or grid list puts between two children, in
 * pixels, or 0 for a list laid out as a block.
 */
function rowGapOf(element: HTMLElement | null): number {
  if (!element) return 0;
  return Number.parseFloat(getComputedStyle(element).rowGap) || 0;
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
 * progress bars. The virtualizer hook is passed in as `use`
 * (`useVirtualizer` from `@tanstack/react-virtual`), so the main entry never
 * imports that package.
 *
 * @param props - See {@link FileUploaderVirtualOptions}.
 *
 * @example
 * ```tsx
 * import { useVirtualizer } from "@tanstack/react-virtual";
 *
 * <FileUploader.Provider multiple upload={upload}>
 *   <FileUploader.Root>
 *     <FileUploader.Dropzone />
 *     <FileUploader.VirtualList use={useVirtualizer} estimateSize={64} />
 *   </FileUploader.Root>
 * </FileUploader.Provider>
 * ```
 */
export function FileUploaderVirtualList({
  use: useVirtualizer,
  estimateSize = 56,
  overscan = 6,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: FileUploaderVirtualOptions) {
  const { components: C, slotProps, items, variant } = useFileUploaderContext();

  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateSize,
    overscan,
    initialRect: { width: 0, height: maxHeight },
  });

  if (variant === "tile" || !items.length) return null;

  const virtualItems = virtualizer.getVirtualItems();
  // A flex list puts its gap between the spacers and the rows too; take it off them.
  const gap = rowGapOf(scrollElement);
  const before = (virtualItems[0]?.start ?? 0) - gap;
  const after = virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0) - gap;

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
