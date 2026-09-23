import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import type { Rejection, UploadFn, UploadItem, UploadResult } from "./types";
import {
  defaultValidationLabels,
  isImage,
  screenFiles,
  type Constraints,
  type ValidationLabels,
} from "./validate";

/**
 * Make id
 *
 * A short unique id for an item. Never derived from the file name, because two
 * picked files can share one.
 */
let counter = 0;
const makeId = () => `f${(counter += 1)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Initial value
 *
 * What an uploader can start from: full items, plain files (a picker restoring
 * a draft) or URLs (a record being edited).
 */
export type InitialValue<TData = unknown> = UploadItem<TData>[] | File[] | string[];

/**
 * Item from file
 *
 * Wraps a picked file as a `ready` item, with a preview for images.
 *
 * @param file - The picked file.
 * @param withPreview - Whether to create an object URL.
 * @returns The new item.
 */
export function itemFromFile<TData = unknown>(file: File, withPreview = true): UploadItem<TData> {
  return {
    id: makeId(),
    name: file.name,
    size: file.size,
    type: file.type,
    status: "ready",
    progress: 0,
    file,
    previewUrl: withPreview && isImage(file.type) ? makePreviewUrl(file) : undefined,
  };
}

/**
 * Make preview url
 *
 * An object URL for a picked image. Previews are a nicety, so a runtime that
 * lacks `createObjectURL` — or refuses one — must not break picking files.
 *
 * @param file - The picked file.
 * @returns The object URL, or undefined.
 */
function makePreviewUrl(file: File): string | undefined {
  try {
    return typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Item from url
 *
 * Wraps an already-stored URL as a `done` item, so editing a record shows what
 * is already there.
 *
 * @param url - The stored URL.
 * @returns The new item.
 */
export function itemFromUrl<TData = unknown>(url: string): UploadItem<TData> {
  const name = decodeURIComponent(url.split("?")[0]!.split("/").pop() ?? url);
  return {
    id: makeId(),
    name,
    size: 0,
    /** Guessed from the extension, so a restored image still previews. */
    type: typeFromName(name),
    status: "done",
    progress: 100,
    url,
  };
}

/**
 * Image extensions
 *
 * Enough to recognise a stored picture by its URL.
 */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"];

/**
 * Type from name
 *
 * A MIME type guessed from a file name, for items restored from a URL where
 * the server never told us what they are.
 *
 * @param name - The file name.
 * @returns An image MIME type, or "".
 */
export function typeFromName(name: string): string {
  const lower = name.toLowerCase();
  const match = IMAGE_EXTENSIONS.find((extension) => lower.endsWith(extension));
  if (!match) return "";
  const subtype = match === ".jpg" ? "jpeg" : match === ".svg" ? "svg+xml" : match.slice(1);
  return `image/${subtype}`;
}

/**
 * To items
 *
 * Normalizes whatever you passed — items, files or URLs — into items.
 *
 * @param value - See {@link InitialValue}.
 * @param withPreview - Whether files get an object URL.
 * @returns The items.
 */
export function toItems<TData = unknown>(
  value: InitialValue<TData> | undefined,
  withPreview = true,
): UploadItem<TData>[] {
  if (!value?.length) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return itemFromUrl<TData>(entry);
    if (entry instanceof File) return itemFromFile<TData>(entry, withPreview);
    return entry;
  });
}

/**
 * Get files
 *
 * The picked files, for picker mode where the form wants `File[]`.
 *
 * @param items - The uploader's items.
 * @returns Every item's file, skipping restored ones.
 *
 * @example
 * ```tsx
 * <FileUploader accept=".csv" onValueChange={(items) => form.setValue("sheet", getFiles(items)[0])} />
 * ```
 */
export const getFiles = (items: readonly UploadItem[]): File[] =>
  items.map((item) => item.file).filter((file): file is File => file instanceof File);

/**
 * Get urls
 *
 * The stored URLs, for records that persist plain strings.
 *
 * @param items - The uploader's items.
 * @returns Every uploaded item's URL.
 */
export const getUrls = (items: readonly UploadItem[]): string[] =>
  items.map((item) => item.url).filter((url): url is string => !!url);

/**
 * File uploader options
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface UseFileUploaderOptions<TData = unknown> extends Constraints {
  /** Allow more than one file. Defaults to `false`, like the native input. */
  multiple?: boolean;
  /** Nothing can be picked, dropped or removed. */
  disabled?: boolean;

  /** Controlled items. */
  value?: UploadItem<TData>[];
  /** Called with the new items after every change. */
  onValueChange?: (items: UploadItem<TData>[]) => void;
  /** Where an uncontrolled uploader starts: items, files or URLs. */
  defaultValue?: InitialValue<TData>;

  /** Convenience for picker mode: the picked files, whenever they change. */
  onFilesChange?: (files: File[]) => void;
  /** Convenience for upload mode: the stored URLs, whenever they change. */
  onUrlsChange?: (urls: string[]) => void;

  /**
   * Sends one file. Omit it and nothing is ever uploaded — the component
   * becomes a picker and items stay `ready`.
   */
  upload?: UploadFn<TData>;
  /** Start uploading as soon as files are picked. Defaults to `true`. */
  autoUpload?: boolean;
  /** How many uploads may run at once. Defaults to `3`. */
  concurrency?: number;

  /** Called for each file that finished uploading. */
  onUploaded?: (item: UploadItem<TData>) => void;
  /** Called when an upload fails. */
  onUploadError?: (error: unknown, item: UploadItem<TData>) => void;
  /** Called with the files the constraints turned away. */
  onReject?: (rejections: Rejection[]) => void;

  /** Object-URL previews for images. `"auto"` (the default) means images only. */
  preview?: boolean | "auto";
  /** Wording for rejection messages. */
  validationLabels?: Partial<ValidationLabels>;
  /** Swallow drops that miss the drop zone, so the browser doesn't open the file. */
  captureWindowDrops?: boolean;
}

/**
 * File uploader model
 *
 * Everything the renderer needs, and everything a custom renderer might want.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderModel<TData = unknown> {
  /** Every item, in the order they were added. */
  items: UploadItem<TData>[];
  /** The picked files (picker mode's value). */
  files: File[];
  /** The stored URLs (upload mode's value). */
  urls: string[];

  /** Adds files, applying the constraints first. */
  add: (files: File[] | FileList | null) => void;
  /** Removes an item, aborting its upload if it's in flight. */
  remove: (id: string) => void;
  /** Uploads a failed item again. */
  retry: (id: string) => void;
  /** Aborts an in-flight upload, leaving the item `ready`. */
  cancel: (id: string) => void;
  /** Removes everything. */
  clear: () => void;
  /** Uploads every `ready` item; used when `autoUpload` is off. */
  uploadAll: () => void;
  /** Opens the file dialog. */
  open: () => void;

  /** A file is over the drop zone. */
  isDragging: boolean;
  /** At least one upload is in flight. */
  isUploading: boolean;
  /** Whether another file would fit under `maxFiles` / `multiple`. */
  canAddMore: boolean;
  /** Files the constraints turned away, newest batch last. */
  rejections: Rejection[];
  /** Clears the rejection list. */
  clearRejections: () => void;

  /** Whether an `upload` function was given. */
  uploadable: boolean;
  disabled: boolean;
  multiple: boolean;
  accept?: string;

  /** Spread onto the drop target: drag handlers, keyboard and ARIA. */
  dropzoneProps: {
    onDragEnter: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDragLeave: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent) => void;
    role: "button";
    tabIndex: number;
    "aria-disabled": boolean | undefined;
    "data-dragging": string | undefined;
    "data-disabled": string | undefined;
  };
  /** Spread onto the hidden `<input type="file">`. */
  inputProps: InputHTMLAttributes<HTMLInputElement> & { ref: React.Ref<HTMLInputElement> };
}

/**
 * useFileUploader
 *
 * The headless file uploader: selection, drag state, validation, previews and
 * a bounded upload queue with cancellation. No markup.
 *
 * Give it an `upload` function and it uploads; leave it out and it is a picker
 * that never touches the network.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param options - See {@link UseFileUploaderOptions}.
 * @returns See {@link FileUploaderModel}.
 *
 * @example
 * ```tsx
 * const uploader = useFileUploader({
 *   accept: "image/*",
 *   maxSize: 5 * 1024 * 1024,
 *   upload: async (file, { signal, onProgress }) => {
 *     const form = new FormData();
 *     form.append("file", file);
 *     const res = await axios.post("/files/upload", form, {
 *       signal,
 *       onUploadProgress: (e) => e.total && onProgress((e.loaded / e.total) * 100),
 *     });
 *     return { url: res.data.url };
 *   },
 * });
 * ```
 */
export function useFileUploader<TData = unknown>(
  options: UseFileUploaderOptions<TData> = {},
): FileUploaderModel<TData> {
  const {
    accept,
    maxSize,
    minSize,
    maxFiles,
    validate,
    multiple = false,
    disabled = false,
    upload,
    autoUpload = true,
    concurrency = 3,
    onUploaded,
    onUploadError,
    onReject,
    preview = "auto",
    captureWindowDrops = false,
  } = options;

  const limit = maxFiles ?? (multiple ? undefined : 1);
  const withPreview = preview !== false;

  const [internal, setInternal] = useState<UploadItem<TData>[]>(() =>
    toItems<TData>(options.defaultValue, withPreview),
  );
  const controlled = options.value !== undefined;
  const items = controlled ? options.value! : internal;

  const [isDragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const aborters = useRef(new Map<string, AbortController>());
  const running = useRef(0);
  const queue = useRef<string[]>([]);

  /** Callbacks and the current items, read from the latest render inside async work. */
  const latest = useRef({ items, options });
  latest.current = { items, options };

  const commit = useCallback(
    (next: UploadItem<TData>[] | ((prev: UploadItem<TData>[]) => UploadItem<TData>[])) => {
      const resolve = (prev: UploadItem<TData>[]) =>
        typeof next === "function" ? (next as (p: UploadItem<TData>[]) => UploadItem<TData>[])(prev) : next;

      const previous = latest.current.items;
      const value = resolve(previous);
      latest.current.items = value;
      if (!controlled) setInternal(value);

      const { onValueChange, onFilesChange, onUrlsChange } = latest.current.options;
      onValueChange?.(value);
      onFilesChange?.(getFiles(value));
      onUrlsChange?.(getUrls(value));
    },
    [controlled],
  );

  const patch = useCallback(
    (id: string, changes: Partial<UploadItem<TData>>) =>
      commit((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item))),
    [commit],
  );

  /* ----------------------------------------------------------- uploading */

  const send = useCallback(
    async (id: string) => {
      const item = latest.current.items.find((entry) => entry.id === id);
      const uploadFn = latest.current.options.upload;
      if (!item?.file || !uploadFn) return;

      const controller = new AbortController();
      aborters.current.set(id, controller);
      patch(id, { status: "uploading", progress: 0, error: undefined });

      try {
        const result: UploadResult<TData> = await uploadFn(item.file, {
          signal: controller.signal,
          item,
          onProgress: (percent) => {
            if (controller.signal.aborted) return;
            patch(id, { progress: Math.max(0, Math.min(100, Math.round(percent))) });
          },
        });

        if (controller.signal.aborted) return;
        const url = typeof result === "string" ? result : result?.url;
        const data = typeof result === "object" && result ? (result.data as TData) : undefined;
        patch(id, { status: "done", progress: 100, url, data, error: undefined });
        const done = latest.current.items.find((entry) => entry.id === id);
        if (done) latest.current.options.onUploaded?.(done);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Upload failed";
        patch(id, { status: "error", error: message, progress: 0 });
        const failed = latest.current.items.find((entry) => entry.id === id);
        if (failed) latest.current.options.onUploadError?.(error, failed);
      } finally {
        aborters.current.delete(id);
      }
    },
    [patch],
  );

  /** Keeps at most `concurrency` uploads in flight, starting the next as each finishes. */
  const pump = useCallback(() => {
    while (running.current < Math.max(1, concurrency) && queue.current.length) {
      const id = queue.current.shift()!;
      running.current += 1;
      void send(id).finally(() => {
        running.current -= 1;
        pump();
      });
    }
  }, [concurrency, send]);

  const enqueue = useCallback(
    (ids: string[]) => {
      if (!latest.current.options.upload || !ids.length) return;
      queue.current.push(...ids);
      pump();
    },
    [pump],
  );

  /* ------------------------------------------------------------- actions */

  const add = useCallback(
    (incoming: File[] | FileList | null) => {
      if (disabled || !incoming) return;
      const files = Array.from(incoming);
      if (!files.length) return;

      const replacing = !multiple;
      const taken = replacing ? 0 : latest.current.items.length;
      const { accepted, rejected } = screenFiles(
        files,
        { accept, maxSize, minSize, maxFiles: limit, validate },
        taken,
        { ...defaultValidationLabels, ...latest.current.options.validationLabels },
      );

      if (rejected.length) {
        setRejections((prev) => [...prev, ...rejected]);
        latest.current.options.onReject?.(rejected);
      }
      if (!accepted.length) return;

      const created = accepted.map((file) => itemFromFile<TData>(file, withPreview));
      if (replacing) {
        for (const item of latest.current.items) releasePreview(item);
        commit(created);
      } else {
        commit((prev) => [...prev, ...created]);
      }

      if (autoUpload) enqueue(created.map((item) => item.id));
    },
    [accept, autoUpload, commit, disabled, enqueue, limit, maxSize, minSize, multiple, validate, withPreview],
  );

  const cancel = useCallback(
    (id: string) => {
      aborters.current.get(id)?.abort();
      aborters.current.delete(id);
      queue.current = queue.current.filter((queued) => queued !== id);
      patch(id, { status: "ready", progress: 0 });
    },
    [patch],
  );

  const remove = useCallback(
    (id: string) => {
      if (disabled) return;
      aborters.current.get(id)?.abort();
      aborters.current.delete(id);
      queue.current = queue.current.filter((queued) => queued !== id);
      const item = latest.current.items.find((entry) => entry.id === id);
      if (item) releasePreview(item);
      commit((prev) => prev.filter((entry) => entry.id !== id));
      /** Let the same file be picked again right after removing it. */
      if (inputRef.current) inputRef.current.value = "";
    },
    [commit, disabled],
  );

  const clear = useCallback(() => {
    for (const item of latest.current.items) releasePreview(item);
    for (const controller of aborters.current.values()) controller.abort();
    aborters.current.clear();
    queue.current = [];
    commit([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [commit]);

  const retry = useCallback((id: string) => enqueue([id]), [enqueue]);

  const uploadAll = useCallback(
    () =>
      enqueue(
        latest.current.items
          .filter((item) => item.file && (item.status === "ready" || item.status === "error"))
          .map((item) => item.id),
      ),
    [enqueue],
  );

  const open = useCallback(() => {
    if (disabled) return;
    /** Clear first, so re-picking the identical file still fires `change`. */
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }, [disabled]);

  /* --------------------------------------------------------------- drag */

  const dropzoneProps = useMemo(
    () => ({
      onDragEnter: (event: DragEvent) => {
        if (disabled) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      },
      onDragOver: (event: DragEvent) => {
        if (disabled) return;
        /** Required, or the browser refuses the drop. */
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: (event: DragEvent) => {
        if (disabled) return;
        event.preventDefault();
        /** Counted, so moving over a child doesn't flicker the state off. */
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      },
      onDrop: (event: DragEvent) => {
        if (disabled) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        add(event.dataTransfer?.files ?? null);
      },
      onClick: open,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      },
      role: "button" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-disabled": disabled || undefined,
      "data-dragging": isDragging ? "" : undefined,
      "data-disabled": disabled ? "" : undefined,
    }),
    [add, disabled, isDragging, open],
  );

  const inputProps = useMemo(
    () => ({
      ref: inputRef,
      type: "file" as const,
      multiple,
      accept: Array.isArray(accept) ? accept.join(",") : accept,
      disabled,
      tabIndex: -1,
      style: {
        position: "absolute" as const,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden" as const,
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap" as const,
        border: 0,
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => add(event.target.files),
      /**
       * The input lives inside the clickable zone, so its own click would
       * bubble up, reopen the dialog and clear the selection mid-flight.
       */
      onClick: (event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation(),
    }),
    [accept, add, disabled, multiple],
  );

  /** A drop that misses the zone would otherwise navigate the tab to the file. */
  useEffect(() => {
    if (!captureWindowDrops) return;
    const swallow = (event: globalThis.DragEvent) => event.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, [captureWindowDrops]);

  /** Stop in-flight uploads and release previews when the component goes away. */
  useEffect(
    () => () => {
      for (const controller of aborters.current.values()) controller.abort();
      aborters.current.clear();
      for (const item of latest.current.items) releasePreview(item);
    },
    [],
  );

  const files = useMemo(() => getFiles(items), [items]);
  const urls = useMemo(() => getUrls(items), [items]);

  return {
    items,
    files,
    urls,
    add,
    remove,
    retry,
    cancel,
    clear,
    uploadAll,
    open,
    isDragging,
    isUploading: items.some((item) => item.status === "uploading"),
    canAddMore: !disabled && (limit === undefined || items.length < limit),
    rejections,
    clearRejections: () => setRejections([]),
    uploadable: !!upload,
    disabled,
    multiple,
    accept: Array.isArray(accept) ? accept.join(",") : accept,
    dropzoneProps,
    inputProps,
  };
}

/**
 * Release preview
 *
 * Revokes an item's object URL, so removing files doesn't leak them.
 */
function releasePreview(item: UploadItem<any>) {
  if (!item.previewUrl || typeof URL === "undefined" || !URL.revokeObjectURL) return;
  try {
    URL.revokeObjectURL(item.previewUrl);
  } catch {
    /** Releasing a preview is best-effort; never let it break a removal. */
  }
}
