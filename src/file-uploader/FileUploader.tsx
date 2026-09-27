"use client";

import { useMemo, type HTMLAttributes, type ReactNode } from "react";
import { useLocaleSection } from "../locale/context";
import type { LocaleInput } from "../locale/types";
import type { UploadItem } from "./core/types";
import {
  useFileUploader,
  type FileUploaderModel,
  type UseFileUploaderOptions,
} from "./core/useFileUploader";
import { defaultValidationLabels, formatBytes, type ValidationLabels } from "./core/validate";
import {
  FileUploaderActions,
  FileUploaderCompact,
  FileUploaderDropzone,
  FileUploaderItemView,
  FileUploaderList,
  FileUploaderRejections,
} from "./parts";
import {
  FileUploaderContext,
  useFileUploaderContext,
  type FileUploaderContextValue,
} from "./slots/context";
import {
  defaultFileUploaderLabels,
  fileUploaderFallbacks,
} from "./slots/fallbacks";
import type {
  FileUploaderComponents,
  FileUploaderLabels,
  FileUploaderSlotProps,
  UploaderRootSlotProps,
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
 * Provider props
 *
 * The hook's options, plus how the parts render: the variant, the slots, the
 * labels and the slot props.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderProviderProps<TData = unknown> extends UseFileUploaderOptions<TData> {
  /** How the component is laid out. Defaults to `dropzone`. */
  variant?: FileUploaderVariant;
  /** Replace any part; the rest stay as fallbacks. */
  components?: Partial<FileUploaderComponents>;
  /** Override any text. Wins over `locale`. */
  labels?: Partial<FileUploaderLabels>;
  /** The language: a locale object, or the tag of one given to `SlotsmithProvider`. Defaults to the provider's. */
  locale?: LocaleInput;
  /** Extra DOM props for the element parts. */
  slotProps?: FileUploaderSlotProps;
  /** Your layout, built from the compound parts and your own components. */
  children?: ReactNode;
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
 * Validation for a locale
 *
 * The hook formats the size in a size message itself, always in plain digits.
 * With a tag, the two size messages are handed the limit written in that
 * language's digits instead; without one the wording is returned untouched.
 *
 * @param labels - The merged validation wording.
 * @param code - The active tag, if any.
 * @param limits - The size limits the hook checks against.
 * @returns The wording to hand the hook.
 */
function validationFor(
  labels: ValidationLabels,
  code: string | undefined,
  limits: { maxSize?: number; minSize?: number },
): ValidationLabels {
  if (!code) return labels;
  const { maxSize, minSize } = limits;
  return {
    ...labels,
    tooLarge: (name, max) => labels.tooLarge(name, maxSize === undefined ? max : formatBytes(maxSize, code)),
    tooSmall: (name, min) => labels.tooSmall(name, minSize === undefined ? min : formatBytes(minSize, code)),
  };
}

/**
 * FileUploader.Provider
 *
 * Runs the uploader and shares it with the compound parts and
 * `useFileUploaderContext()`. Renders no markup itself, so you choose the
 * layout.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @param props - See {@link FileUploaderProviderProps}.
 *
 * @example
 * ```tsx
 * <FileUploader.Provider multiple accept="image/*" upload={uploadToApi}>
 *   <MyHeader />
 *   <FileUploader.Root>
 *     <FileUploader.Dropzone />
 *     <FileUploader.List />
 *     <FileUploader.Rejections />
 *   </FileUploader.Root>
 * </FileUploader.Provider>
 * ```
 */
export function FileUploaderProvider<TData = unknown>({
  variant = "dropzone",
  components,
  labels: labelOverrides,
  locale,
  slotProps,
  children,
  ...options
}: FileUploaderProviderProps<TData>) {
  const { code, labels: localeLabels } = useLocaleSection("fileUploader", locale);
  const { labels: localeValidation } = useLocaleSection("fileValidation", locale);

  /**
   * The hook stays unaware of locales: it is handed the validation wording
   * already merged, English then the locale then the caller's own. With a
   * locale, the sizes in the size messages are rewritten in its digits.
   */
  const validation = validationFor(
    { ...defaultValidationLabels, ...withoutUndefined(localeValidation), ...withoutUndefined(options.validationLabels) },
    code,
    options,
  );
  const model = useFileUploader<TData>({ ...options, validationLabels: validation });

  const parts = useMemo(
    () => ({ ...fileUploaderFallbacks, ...withoutUndefined(components) }),
    [components],
  );
  /** English, then the locale, then the caller's own overrides. */
  const labels = useMemo(
    () => ({ ...defaultFileUploaderLabels, ...withoutUndefined(localeLabels), ...withoutUndefined(labelOverrides) }),
    [localeLabels, labelOverrides],
  );

  const hint = labels.hint({
    accept: model.accept,
    maxSize: options.maxSize ? formatBytes(options.maxSize, code) : undefined,
    maxFiles: options.maxFiles ?? (options.multiple ? undefined : 1),
  });

  const statusLabel = (item: UploadItem<TData>) =>
    item.status === "uploading"
      ? labels.uploading
      : item.status === "done"
        ? labels.done
        : item.status === "error"
          ? labels.failed
          : model.uploadable
            ? labels.ready
            : "";

  const value: FileUploaderContextValue<TData> = {
    ...model,
    components: parts,
    labels,
    slotProps: slotProps ?? {},
    variant,
    hint,
    /** In tile mode the newest item *is* the zone's content. */
    tileItem: variant === "tile" ? model.items[model.items.length - 1] : undefined,
    statusLabel,
    locale: code,
  };

  return <FileUploaderContext.Provider value={value}>{children}</FileUploaderContext.Provider>;
}

/**
 * Root props
 *
 * Plain `<div>` props for the outer element.
 */
export interface FileUploaderRootProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * FileUploader.Root
 *
 * The `Root` slot, carrying `data-variant`, `data-dragging`, `data-disabled`
 * and `data-empty`, so the whole component can be styled from its state.
 *
 * @param props - See {@link FileUploaderRootProps}.
 *
 * @example
 * ```tsx
 * <FileUploader.Root className="shadow-sm">
 *   <FileUploader.Dropzone />
 *   <FileUploader.List />
 * </FileUploader.Root>
 * ```
 */
export function FileUploaderRoot({ className, children, ...htmlProps }: FileUploaderRootProps) {
  const { components: C, slotProps, variant, items, isDragging, disabled } = useFileUploaderContext();

  return (
    <C.Root
      className={className}
      data-variant={variant}
      data-dragging={isDragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-empty={items.length ? undefined : ""}
      {...mergeSlot(slotProps.root, htmlProps)}
    >
      {children}
    </C.Root>
  );
}

/**
 * File uploader props
 *
 * The provider props, the root's `<div>` props, and layout options.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
export interface FileUploaderProps<TData = unknown>
  extends FileUploaderProviderProps<TData>,
    Omit<FileUploaderRootProps, "children" | "onChange" | "onError" | "defaultValue"> {
  /** Hide the item list, e.g. when you render the files yourself. */
  hideList?: boolean;
  /** Rendered inside the drop zone, under the title. */
  children?: ReactNode;
}

/**
 * Provider keys
 *
 * The `<FileUploader>` props that go to the provider — every hook option, plus
 * the variant and the slot overrides; the rest go to the root.
 */
const PROVIDER_KEYS = [
  "accept", "maxSize", "minSize", "maxFiles", "validate", "multiple", "disabled",
  "value", "onValueChange", "defaultValue", "onFilesChange", "onUrlsChange",
  "upload", "autoUpload", "concurrency", "onUploaded", "onUploadError", "onReject",
  "preview", "validationLabels", "captureWindowDrops",
  "variant", "components", "labels", "locale", "slotProps",
] as const;

/**
 * Missing provider keys
 *
 * Compile-time guard: fails to type-check when a provider prop is missing from
 * {@link PROVIDER_KEYS}. Since the provider props extend the hook's options,
 * this also covers every option the hook must be handed.
 */
type MissingProviderKeys = Exclude<
  keyof FileUploaderProviderProps,
  (typeof PROVIDER_KEYS)[number] | "children"
>;
const _allProviderKeysListed: [MissingProviderKeys] extends [never] ? true : MissingProviderKeys = true;
void _allProviderKeysListed;

const providerKeys = new Set<string>(PROVIDER_KEYS);

/**
 * Split file uploader props
 *
 * Splits `<FileUploader>` props into provider options and root / layout props.
 * Useful when building your own uploader on the same props. `children` stays in
 * `rest`, because the default layout renders it inside the drop zone rather
 * than under the provider.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 * @typeParam P - The full props type.
 * @returns `providerProps` for `FileUploader.Provider` and `rest` for your layout.
 *
 * @example
 * ```tsx
 * function AvatarField(props: FileUploaderProps & { label: string }) {
 *   const { providerProps, rest } = splitFileUploaderProps<unknown, typeof props>(props);
 *   const { label, children, ...rootProps } = rest;
 *   return (
 *     <FileUploader.Provider {...providerProps} variant="tile">
 *       <span>{label}</span>
 *       <FileUploader.Root {...rootProps}>
 *         <FileUploader.Dropzone>{children}</FileUploader.Dropzone>
 *       </FileUploader.Root>
 *     </FileUploader.Provider>
 *   );
 * }
 * ```
 */
export function splitFileUploaderProps<TData, P extends FileUploaderProps<TData>>(props: P) {
  const providerProps: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (providerKeys.has(key) ? providerProps : rest)[key] = value;
  }
  return {
    providerProps: providerProps as unknown as FileUploaderProviderProps<TData>,
    rest: rest as Omit<P, Exclude<keyof FileUploaderProviderProps<TData>, "children">>,
  };
}

/**
 * File uploader component
 *
 * The default layout: root, drop zone or compact row, item list and
 * rejections. Exported as `FileUploader`.
 *
 * @typeParam TData - Whatever `upload` resolves with per file.
 */
function FileUploaderComponent<TData = unknown>(props: FileUploaderProps<TData>) {
  const { providerProps, rest } = splitFileUploaderProps<TData, FileUploaderProps<TData>>(props);
  const { hideList = false, children, ...htmlProps } = rest;

  return (
    <FileUploaderProvider<TData> {...providerProps}>
      <FileUploaderRoot {...htmlProps}>
        <FileUploaderDropzone>{children}</FileUploaderDropzone>
        <FileUploaderCompact />
        {!hideList && <FileUploaderList />}
        <FileUploaderRejections />
      </FileUploaderRoot>
    </FileUploaderProvider>
  );
}

/**
 * Merge slot
 *
 * Joins the root's slot props with the DOM props passed to the component.
 */
function mergeSlot(slot: UploaderRootSlotProps | undefined, html: HTMLAttributes<HTMLDivElement>) {
  if (!slot) return html;
  return {
    ...slot,
    ...html,
    className: [slot.className, html.className].filter(Boolean).join(" ") || undefined,
    style: slot.style || html.style ? { ...slot.style, ...html.style } : undefined,
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
 * `labels`, and the fallbacks are plain accessible HTML. The compound parts
 * (`FileUploader.Provider`, `.Root`, `.Dropzone`, `.Compact`, `.List`,
 * `.Item`, `.Actions`, `.Rejections`) are there when the default layout is not
 * enough.
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
export const FileUploader = /* @__PURE__ */ Object.assign(FileUploaderComponent, {
  Provider: FileUploaderProvider,
  Root: FileUploaderRoot,
  Dropzone: FileUploaderDropzone,
  Compact: FileUploaderCompact,
  List: FileUploaderList,
  Item: FileUploaderItemView,
  Actions: FileUploaderActions,
  Rejections: FileUploaderRejections,
});

export type { FileUploaderModel };
