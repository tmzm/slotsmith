/**
 * Upload status
 *
 * Where one item is in its life: picked but not sent (`ready`), in flight
 * (`uploading`), stored (`done`), or failed (`error`). In picker mode — no
 * `upload` function — items stay `ready` forever.
 */
export type UploadStatus = "ready" | "uploading" | "done" | "error";

/**
 * Upload item
 *
 * One file in the list. Items picked by the user carry their `file`; items
 * restored from a record carry a `url` instead and no `file`.
 *
 * @typeParam TData - Whatever the `upload` function returns for an item.
 */
export interface UploadItem<TData = unknown> {
  /** Stable identity. Never the file name — two files can share one. */
  id: string;
  name: string;
  /** Size in bytes; 0 for restored items whose size isn't known. */
  size: number;
  /** MIME type, or "" when the browser doesn't know it. */
  type: string;
  status: UploadStatus;
  /** 0–100. 100 as soon as the item is `done`. */
  progress: number;
  /** Why it failed, ready to show. */
  error?: string;
  /** Where it lives now: the server URL, or a restored item's existing URL. */
  url?: string;
  /** The picked file. Absent for restored items. */
  file?: File;
  /** A local object URL for images, revoked when the item goes away. */
  previewUrl?: string;
  /** Whatever `upload` resolved with, for ids and metadata the server returns. */
  data?: TData;
}

/**
 * Upload context
 *
 * Passed to the `upload` function so it can report progress and stop when the
 * item is cancelled or the component unmounts.
 */
export interface UploadContext {
  /** Aborted when the item is cancelled or removed mid-flight. */
  signal: AbortSignal;
  /** Report 0–100 as the bytes go out. */
  onProgress: (percent: number) => void;
  /** The item being uploaded, for ids the server needs. */
  item: UploadItem;
}

/**
 * Upload result
 *
 * What an `upload` function may resolve with: a URL string, an object with a
 * `url` and any extra data, or nothing at all.
 */
export type UploadResult<TData = unknown> = string | { url?: string; data?: TData } | void;

/**
 * Upload function
 *
 * Sends one file anywhere you like — fetch, axios, a presigned S3 PUT — and
 * resolves with the URL to keep. Omit it and the component never touches the
 * network.
 *
 * @example
 * ```tsx
 * const upload = async (file, { signal, onProgress }) => {
 *   const form = new FormData();
 *   form.append("file", file);
 *   const res = await axios.post("/files/upload", form, {
 *     signal,
 *     onUploadProgress: (e) => e.total && onProgress((e.loaded / e.total) * 100),
 *   });
 *   return { url: res.data.url };
 * };
 * ```
 */
export type UploadFn<TData = unknown> = (
  file: File,
  context: UploadContext,
) => Promise<UploadResult<TData>>;

/**
 * Rejection reason
 *
 * Why a picked file never became an item.
 */
export type RejectionReason = "type" | "size-max" | "size-min" | "count" | "custom";

/**
 * Rejection
 *
 * A file the constraints turned away, with a message already worded.
 */
export interface Rejection {
  file: File;
  reason: RejectionReason;
  message: string;
}
