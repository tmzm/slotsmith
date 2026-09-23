import type { ComponentType, HTMLAttributes, InputHTMLAttributes, LiHTMLAttributes, ReactNode } from "react";
import type { Rejection, UploadItem } from "../core/types";

/**
 * Root slot props
 *
 * Element slot: plain `<div>` props for the outer element. Carries
 * `data-variant`, `data-dragging`, `data-disabled` and `data-empty`.
 */
export type UploaderRootSlotProps = HTMLAttributes<HTMLDivElement>;

/**
 * Dropzone slot props
 *
 * Element slot: the drop target. Already carries the drag handlers, the
 * keyboard handler, `role="button"`, `tabIndex` and `data-dragging`, so a
 * replacement only has to render them.
 */
export type DropzoneSlotProps = HTMLAttributes<HTMLDivElement>;

/**
 * Input slot props
 *
 * Element slot: the real `<input type="file">`. It stays in the accessibility
 * tree — visually hidden, not `display: none` — so assistive tech can reach it.
 */
export type UploaderInputSlotProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * List slot props
 *
 * Element slot: the `<ul>` holding the items.
 */
export type UploaderListSlotProps = HTMLAttributes<HTMLUListElement>;

/**
 * Item slot props
 *
 * Element slot: one `<li>`. Carries `data-status` and `data-image`.
 */
export type UploaderItemSlotProps = LiHTMLAttributes<HTMLLIElement>;

/**
 * Trigger slot props
 *
 * Widget slot: the "browse" button inside the drop zone.
 */
export interface UploaderTriggerSlotProps {
  /** Opens the file dialog. */
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}

/**
 * Icon slot props
 *
 * Widget slot: the picture at rest in the drop zone.
 */
export interface UploaderIconSlotProps {
  /** Whether a file is currently over the zone. */
  dragging: boolean;
}

/**
 * Thumbnail slot props
 *
 * Widget slot: an item's preview. Images get a local object URL as soon as
 * they're picked, so nothing waits for the server.
 */
export interface ThumbnailSlotProps {
  item: UploadItem;
  /** The object URL, or the stored URL for restored items. */
  src?: string;
  /** Whether the item is an image. */
  isImage: boolean;
  /** Accessible name for the picture. */
  alt: string;
}

/**
 * Progress slot props
 *
 * Widget slot: one item's progress. The fallback is a real `progressbar`.
 */
export interface UploaderProgressSlotProps {
  /** 0–100. */
  value: number;
  /** Whether the upload is in flight. */
  active: boolean;
  "aria-label": string;
}

/**
 * Action slot props
 *
 * Widget slot shared by remove, retry and cancel, so one button component
 * covers all three.
 */
export interface UploaderActionSlotProps {
  action: "remove" | "retry" | "cancel";
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}

/**
 * Item meta slot props
 *
 * Widget slot: the line under an item's name — size, status, or the error.
 */
export interface ItemMetaSlotProps {
  item: UploadItem;
  /** The size, already formatted (`2.4 MB`). Empty for restored items. */
  size: string;
  /** Status wording from the labels. */
  status: ReactNode;
}

/**
 * Rejections slot props
 *
 * Widget slot: the files the constraints turned away. Announced politely.
 */
export interface RejectionsSlotProps {
  rejections: Rejection[];
  onDismiss: () => void;
  dismissLabel: string;
}

/**
 * Empty slot props
 *
 * Widget slot: the drop zone's resting content.
 */
export interface UploaderEmptySlotProps {
  title: ReactNode;
  hint: ReactNode;
  dragging: boolean;
}

/**
 * File uploader components
 *
 * Every replaceable part. Element parts take plain DOM props; widget parts take
 * semantic props and usually want a small adapter.
 *
 * @example
 * ```tsx
 * <FileUploader
 *   components={{
 *     Dropzone: (props) => <Card {...props} />,
 *     Trigger: ({ onClick, children }) => <Button onClick={onClick}>{children}</Button>,
 *     Progress: ({ value }) => <LinearProgress variant="determinate" value={value} />,
 *   }}
 * />
 * ```
 */
export interface FileUploaderComponents {
  /** Fallback: `<div class="sfu">`. */
  Root: ComponentType<UploaderRootSlotProps>;
  /** Fallback: `<div class="sfu__zone">` with the drag handlers. */
  Dropzone: ComponentType<DropzoneSlotProps>;
  /** Fallback: a visually hidden `<input type="file">`. */
  Input: ComponentType<UploaderInputSlotProps>;
  /** Fallback: inline SVG tray / image icon. */
  Icon: ComponentType<UploaderIconSlotProps>;
  /** Fallback: title and hint inside the zone. */
  Empty: ComponentType<UploaderEmptySlotProps>;
  /** Fallback: `<button class="sfu__browse">`. */
  Trigger: ComponentType<UploaderTriggerSlotProps>;
  /** Fallback: `<ul class="sfu__list">`. */
  List: ComponentType<UploaderListSlotProps>;
  /** Fallback: `<li class="sfu__item">`. */
  Item: ComponentType<UploaderItemSlotProps>;
  /** Fallback: `<img>` for images, a file glyph otherwise. */
  Thumbnail: ComponentType<ThumbnailSlotProps>;
  /** Fallback: name plus {@link ItemMetaSlotProps}. */
  ItemMeta: ComponentType<ItemMetaSlotProps>;
  /** Fallback: `<div role="progressbar">`. */
  Progress: ComponentType<UploaderProgressSlotProps>;
  /** Fallback: icon `<button>` for remove / retry / cancel. */
  Action: ComponentType<UploaderActionSlotProps>;
  /** Fallback: a dismissible list, announced with `aria-live`. */
  Rejections: ComponentType<RejectionsSlotProps>;
}

/**
 * File uploader labels
 *
 * Every string the component renders. Pass any subset to translate it.
 *
 * @example
 * ```tsx
 * <FileUploader
 *   labels={{
 *     title: "اسحب الملفات هنا",
 *     browse: "تصفح",
 *     remove: "إزالة",
 *   }}
 * />
 * ```
 */
export interface FileUploaderLabels {
  /** The drop zone's headline. */
  title: ReactNode;
  /** The line under it; the default names the limits. */
  hint: (limits: { accept?: string; maxSize?: string; maxFiles?: number }) => ReactNode;
  /** While a file is over the zone. */
  dropHere: ReactNode;
  /** The browse button. */
  browse: ReactNode;
  /** Accessible name of the drop zone. */
  dropzone: string;
  remove: string;
  retry: string;
  cancel: string;
  /** Accessible name of an item's progress bar. */
  progress: (name: string) => string;
  /** Status wording per item state. */
  ready: ReactNode;
  uploading: ReactNode;
  done: ReactNode;
  failed: ReactNode;
  /** Accessible name for a preview. */
  preview: (name: string) => string;
  /** Dismisses the rejection list. */
  dismiss: string;
  /** Announced when files are refused. */
  rejectedTitle: (count: number) => ReactNode;
}

/**
 * File uploader slot props
 *
 * Extra DOM props for the element parts: classNames are joined, styles merged,
 * `onClick` chained.
 */
export interface FileUploaderSlotProps {
  root?: UploaderRootSlotProps;
  dropzone?: DropzoneSlotProps;
  list?: UploaderListSlotProps;
  item?: (item: UploadItem) => UploaderItemSlotProps | undefined;
}
