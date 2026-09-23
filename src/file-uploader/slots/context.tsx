"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FileUploaderVariant } from "../FileUploader";
import type { UploadItem } from "../core/types";
import type { FileUploaderModel } from "../core/useFileUploader";
import type { FileUploaderComponents, FileUploaderLabels, FileUploaderSlotProps } from "./types";

/**
 * File uploader context value
 *
 * What `<FileUploader>` and `<FileUploader.Provider>` share with the compound
 * parts and with custom slots: the {@link FileUploaderModel} plus the resolved
 * parts, labels and slot props, and the few values derived from them so no part
 * has to work them out again.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderContextValue<TData = unknown> extends FileUploaderModel<TData> {
  /** Every part, with the fallbacks filled in. */
  components: FileUploaderComponents;
  /** Every label, with the defaults filled in. */
  labels: FileUploaderLabels;
  /** The `slotProps` option, or `{}`. */
  slotProps: FileUploaderSlotProps;
  /** How the component is laid out. */
  variant: FileUploaderVariant;
  /** The line under the drop zone's title, already built from `labels.hint`. */
  hint: ReactNode;
  /** In `tile` mode the newest item, which stands in for the zone's resting content. */
  tileItem?: UploadItem<TData>;
  /** One item's status wording, or `""` when the uploader is a picker. */
  statusLabel: (item: UploadItem<TData>) => ReactNode;
}

/**
 * File uploader context
 *
 * The React context behind {@link useFileUploaderContext}.
 */
export const FileUploaderContext = createContext<FileUploaderContextValue<any> | null>(null);

/**
 * useFileUploaderContext
 *
 * Reads the surrounding uploader: its items, drag state, queue actions, parts
 * and labels. Use it in custom layouts, in toolbars beside the zone, and in
 * parts that need more than the props their slot receives.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @returns See {@link FileUploaderContextValue}.
 * @throws When called outside `<FileUploader>` or `<FileUploader.Provider>`.
 *
 * @example
 * ```tsx
 * function UploadAllButton() {
 *   const { items, uploadAll, isUploading } = useFileUploaderContext();
 *   if (!items.some((item) => item.status === "ready")) return null;
 *   return <button onClick={uploadAll} disabled={isUploading}>Upload all</button>;
 * }
 * ```
 */
export function useFileUploaderContext<TData = unknown>(): FileUploaderContextValue<TData> {
  const value = useContext(FileUploaderContext);
  if (!value) {
    throw new Error("useFileUploaderContext must be used inside <FileUploader> or <FileUploader.Provider>");
  }
  return value as FileUploaderContextValue<TData>;
}

/**
 * Upload item context
 *
 * The React context behind {@link useUploadItem}.
 */
export const UploadItemContext = createContext<UploadItem<any> | null>(null);

/**
 * useUploadItem
 *
 * Reads the item being rendered, for a custom `Item` slot, which otherwise only
 * receives DOM props.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @returns The item, or `null` outside a rendered item.
 *
 * @example
 * ```tsx
 * function SortableItem(props: UploaderItemSlotProps) {
 *   const item = useUploadItem();
 *   const { setNodeRef, transform } = useSortable({ id: item!.id });
 *   return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform) }} {...props} />;
 * }
 * ```
 */
export function useUploadItem<TData = unknown>(): UploadItem<TData> | null {
  return useContext(UploadItemContext) as UploadItem<TData> | null;
}
