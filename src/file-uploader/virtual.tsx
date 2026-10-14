"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { FileUploader, type FileUploaderProps } from "./FileUploader";
import {
  FileUploaderVirtualList as VirtualList,
  type FileUploaderVirtualOptions as VirtualListOptions,
} from "./virtualList";

/**
 * Uploader virtual options
 *
 * The sizes of a windowed item list, with the hook optional:
 * `slotsmith/virtual` passes `useVirtualizer` itself.
 *
 * @example
 * ```tsx
 * <VirtualFileUploader virtual={{ estimateSize: 64, maxHeight: 500 }} multiple upload={upload} />
 * ```
 */
export type FileUploaderVirtualOptions = Omit<VirtualListOptions, "use"> & Partial<Pick<VirtualListOptions, "use">>;

/**
 * File uploader virtual list
 *
 * The main entry's windowed item list with `useVirtualizer` already passed in.
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
export function FileUploaderVirtualList({ use = useVirtualizer, ...props }: FileUploaderVirtualOptions = {}) {
  return <VirtualList use={use} {...props} />;
}

/**
 * Virtual file uploader props
 *
 * The `<FileUploader>` props, with `virtual` taking the sizes only.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export type VirtualFileUploaderProps<TData = unknown> = Omit<FileUploaderProps<TData>, "virtual"> & {
  /** How rows are measured and rendered. */
  virtual?: FileUploaderVirtualOptions;
};

/**
 * VirtualFileUploader
 *
 * `<FileUploader>` with a windowed item list and `useVirtualizer` passed in,
 * for batches of hundreds of files. The same as
 * `<FileUploader virtual={{ use: useVirtualizer, ...virtual }} />`.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link VirtualFileUploaderProps}.
 *
 * @example
 * ```tsx
 * import { VirtualFileUploader } from "slotsmith/virtual";
 *
 * <VirtualFileUploader multiple upload={upload} virtual={{ estimateSize: 64 }} />;
 * ```
 */
export function VirtualFileUploader<TData = unknown>({ virtual, ...props }: VirtualFileUploaderProps<TData>) {
  return <FileUploader<TData> {...props} virtual={{ use: useVirtualizer, ...virtual }} />;
}
