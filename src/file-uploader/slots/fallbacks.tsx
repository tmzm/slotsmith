import { cx } from "../../data-table/slots/fallbacks";
import { formatBytes } from "../core/validate";
import type {
  DropzoneSlotProps,
  FileUploaderComponents,
  FileUploaderLabels,
  ItemMetaSlotProps,
  RejectionsSlotProps,
  ThumbnailSlotProps,
  UploaderActionSlotProps,
  UploaderEmptySlotProps,
  UploaderIconSlotProps,
  UploaderInputSlotProps,
  UploaderItemSlotProps,
  UploaderListSlotProps,
  UploaderProgressSlotProps,
  UploaderRootSlotProps,
  UploaderTriggerSlotProps,
} from "./types";

/**
 * Icon
 *
 * A 20px, stroke-based, decorative glyph shared by the fallbacks.
 */
const Glyph = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/**
 * Root fallback
 *
 * `<div class="sfu">`.
 */
const Root = ({ className, ...props }: UploaderRootSlotProps) => (
  <div className={cx("sfu", className)} {...props} />
);

/**
 * Dropzone fallback
 *
 * `<div class="sfu__zone">`, already holding the drag, click and keyboard
 * handlers the hook provides.
 */
const Dropzone = ({ className, ...props }: DropzoneSlotProps) => (
  <div className={cx("sfu__zone", className)} {...props} />
);

/**
 * Input fallback
 *
 * The real file input, visually hidden but still focusable and announced.
 */
const Input = (props: UploaderInputSlotProps) => <input className="sfu__input" {...props} />;

/**
 * Icon fallback
 *
 * An upload tray that lifts while a file is over the zone.
 */
const Icon = ({ dragging }: UploaderIconSlotProps) => (
  <span className="sfu__icon" data-dragging={dragging || undefined}>
    <Glyph size={24}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Glyph>
  </span>
);

/**
 * Empty fallback
 *
 * The zone's resting copy: a title, and a hint naming the limits.
 */
const Empty = ({ title, hint, dragging }: UploaderEmptySlotProps) => (
  <span className="sfu__copy">
    <span className="sfu__title">{title}</span>
    {!dragging && <span className="sfu__hint">{hint}</span>}
  </span>
);

/**
 * Trigger fallback
 *
 * The browse button. `type="button"`, so it never submits a form.
 */
const Trigger = ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
  <button
    type="button"
    className="sfu__browse"
    disabled={disabled}
    onClick={(event) => {
      /** The zone itself opens the dialog; without this it would open twice. */
      event.stopPropagation();
      onClick();
    }}
  >
    {children}
  </button>
);

/**
 * List fallback
 *
 * `<ul class="sfu__list">`.
 */
const List = ({ className, ...props }: UploaderListSlotProps) => (
  <ul className={cx("sfu__list", className)} {...props} />
);

/**
 * Item fallback
 *
 * `<li class="sfu__item">`.
 */
const Item = ({ className, ...props }: UploaderItemSlotProps) => (
  <li className={cx("sfu__item", className)} {...props} />
);

/**
 * Thumbnail fallback
 *
 * The picture for images, a file glyph for everything else.
 */
const Thumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) => (
  <span className="sfu__thumb">
    {isImage && src ? (
      <img className="sfu__thumb-img" src={src} alt={alt} />
    ) : (
      <Glyph>
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      </Glyph>
    )}
  </span>
);

/**
 * Item meta fallback
 *
 * The name, then the size and status — or the error when there is one.
 */
const ItemMeta = ({ item, size, status }: ItemMetaSlotProps) => (
  <span className="sfu__meta">
    <span className="sfu__name" title={item.name}>
      {item.name}
    </span>
    <span className="sfu__sub">
      {item.status === "error" ? (
        <span className="sfu__error">{item.error}</span>
      ) : (
        <>
          {size && <span>{size}</span>}
          {size && status ? <span aria-hidden="true">·</span> : null}
          {status}
        </>
      )}
    </span>
  </span>
);

/**
 * Progress fallback
 *
 * A real `progressbar`, so the percentage is announced rather than implied.
 */
const Progress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <span
    className="sfu__progress"
    role="progressbar"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    data-active={active || undefined}
    {...aria}
  >
    <span className="sfu__progress-bar" style={{ inlineSize: `${Math.max(0, Math.min(100, value))}%` }} />
  </span>
);

/**
 * Action fallback
 *
 * One icon button for remove, retry and cancel.
 */
const Action = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <button
    type="button"
    className="sfu__action"
    data-action={action}
    disabled={disabled}
    onClick={(event) => {
      /** Actions sit inside the clickable zone in tile mode. */
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    <Glyph size={16}>
      {action === "remove" && (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      )}
      {action === "retry" && (
        <>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </>
      )}
      {action === "cancel" && (
        <>
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </>
      )}
    </Glyph>
  </button>
);

/**
 * Rejections fallback
 *
 * The refused files, announced politely and dismissible — never a toast, so
 * the host app decides how loud errors are.
 */
const Rejections = ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
  <div className="sfu__rejections" role="status" aria-live="polite">
    <ul>
      {rejections.map((rejection, index) => (
        <li key={`${rejection.file.name}-${index}`}>{rejection.message}</li>
      ))}
    </ul>
    <button type="button" className="sfu__action" onClick={onDismiss} aria-label={dismissLabel}>
      <Glyph size={16}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </Glyph>
    </button>
  </div>
);

/**
 * Fallback components
 *
 * The built-in plain-HTML parts, used for anything you don't replace. Styled
 * by the optional `slotsmith/styles.css`.
 */
export const fileUploaderFallbacks: FileUploaderComponents = {
  Root,
  Dropzone,
  Input,
  Icon,
  Empty,
  Trigger,
  List,
  Item,
  Thumbnail,
  ItemMeta,
  Progress,
  Action,
  Rejections,
};

/**
 * Default labels
 *
 * The English wording, and the default hint that names the limits so the user
 * knows them before picking the wrong file.
 */
export const defaultFileUploaderLabels: FileUploaderLabels = {
  title: "Drag and drop, or browse",
  hint: ({ accept, maxSize, maxFiles }) => {
    const parts = [
      accept ? accept.replace(/,/g, ", ") : undefined,
      maxSize ? `up to ${maxSize}` : undefined,
      maxFiles && maxFiles > 1 ? `max ${maxFiles} files` : undefined,
    ].filter(Boolean);
    return parts.join(" · ");
  },
  dropHere: "Drop to add",
  browse: "Browse",
  dropzone: "Add files",
  remove: "Remove file",
  retry: "Retry upload",
  cancel: "Cancel upload",
  progress: (name) => `Uploading ${name}`,
  ready: "Ready",
  uploading: "Uploading…",
  done: "Uploaded",
  failed: "Failed",
  preview: (name) => `Preview of ${name}`,
  dismiss: "Dismiss",
  rejectedTitle: (count) => `${count} ${count === 1 ? "file" : "files"} not added`,
};

/**
 * Format size
 *
 * An item's size for the meta line; empty when the size isn't known, as with
 * files restored from a URL.
 *
 * @param size - Bytes.
 * @returns The formatted size, or "".
 */
export const formatItemSize = (size: number) => (size > 0 ? formatBytes(size) : "");
