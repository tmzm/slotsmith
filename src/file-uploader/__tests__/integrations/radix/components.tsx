import { Cross2Icon, ExclamationTriangleIcon, FileIcon, ReloadIcon, StopIcon, UploadIcon } from "@radix-ui/react-icons";
import { Avatar, Button, Callout, Flex, IconButton, Progress, Text } from "@radix-ui/themes";
import type {
  DropzoneSlotProps,
  FileUploaderComponents,
  ItemMetaSlotProps,
  RejectionsSlotProps,
  ThumbnailSlotProps,
  UploaderActionSlotProps,
  UploaderEmptySlotProps,
  UploaderIconSlotProps,
  UploaderItemSlotProps,
  UploaderListSlotProps,
  UploaderProgressSlotProps,
  UploaderRootSlotProps,
  UploaderTriggerSlotProps,
} from "../../../index";

/**
 * Radix Themes file uploader parts
 *
 * Built from Radix Themes v3 — `Button`, `IconButton`, `Avatar`,
 * `Progress`, `Callout`, `Text` and Radix icons. Radix Themes has no upload
 * component, so the drop zone and the rows are plain elements dressed in its
 * variables (`--accent-*`, `--gray-*`, `--red-*`), which makes them follow the
 * app's `<Theme accentColor appearance>`; their state arrives as `data-*`
 * props, so each part reads its own. The app must import
 * `@radix-ui/themes/styles.css`, as every Radix Themes app already does.
 */

/**
 * Has flag
 *
 * @param props - An element part's props.
 * @param name - A `data-*` attribute.
 * @returns Whether the component set it.
 */
const has = (props: object, name: `data-${string}`) => (props as Record<string, unknown>)[name] !== undefined;

/**
 * Radix dropzone
 *
 * A dashed, lightly filled panel whose border and fill take the accent
 * colour while a file is over it.
 */
function RadixDropzone({ style, ...props }: DropzoneSlotProps) {
  const dragging = has(props, "data-dragging");
  const disabled = has(props, "data-disabled");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-5)",
        textAlign: "center",
        fontFamily: "var(--default-font-family)",
        backgroundColor: dragging ? "var(--accent-a2)" : "var(--gray-a2)",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: dragging ? "var(--accent-8)" : "var(--gray-a7)",
        borderRadius: "var(--radius-4)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : undefined,
        transition: "border-color 150ms, background-color 150ms",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Radix icon
 *
 * An upload arrow, in the accent colour while a file is over the zone.
 */
const RadixIcon = ({ dragging }: UploaderIconSlotProps) => (
  <span aria-hidden="true" style={{ display: "flex", color: dragging ? "var(--accent-11)" : "var(--gray-a11)" }}>
    <UploadIcon width={24} height={24} />
  </span>
);

/**
 * Radix empty
 *
 * The title over a muted hint.
 */
const RadixEmpty = ({ title, hint }: UploaderEmptySlotProps) => (
  <Flex direction="column">
    <Text size="2" weight="medium">
      {title}
    </Text>
    <Text size="2" color="gray">
      {hint}
    </Text>
  </Flex>
);

/**
 * Radix trigger
 *
 * A soft `Button`. The click is stopped so it does not also reach the drop
 * zone and open the dialog twice.
 */
const RadixTrigger = ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
  <Button
    size="1"
    variant="soft"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    {children}
  </Button>
);

/**
 * Radix list
 *
 * The `<ul>` of rows.
 */
const RadixList = ({ style, ...props }: UploaderListSlotProps) => (
  <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", margin: 0, padding: 0, listStyle: "none", ...style }} {...props} />
);

/**
 * Radix item
 *
 * A row like a Radix surface card: a grid so the progress bar can span it,
 * and a red hairline around a failed file.
 */
function RadixItem({ style, ...props }: UploaderItemSlotProps) {
  const failed = (props as Record<string, unknown>)["data-status"] === "error";
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "center",
        columnGap: "var(--space-3)",
        rowGap: "var(--space-2)",
        padding: "var(--space-2)",
        fontFamily: "var(--default-font-family)",
        backgroundColor: "var(--color-surface)",
        boxShadow: `inset 0 0 0 1px ${failed ? "var(--red-a7)" : "var(--gray-a5)"}`,
        borderRadius: "var(--radius-3)",
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Radix thumbnail
 *
 * The preview in `Avatar`'s rounded square, or an `Avatar` holding a file
 * icon. Radix's `Avatar` draws its image only once it has loaded and shows
 * no `alt` until then, so the preview is a plain `<img>` of the same size and
 * radius, which keeps its accessible name from the first render.
 */
const RadixThumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) =>
  isImage && src ? (
    <img
      src={src}
      alt={alt}
      style={{ display: "block", width: "var(--space-7)", height: "var(--space-7)", objectFit: "cover", borderRadius: "var(--radius-2)" }}
    />
  ) : (
    <Avatar size="3" variant="soft" color="gray" fallback={<FileIcon aria-hidden="true" width={18} height={18} />} />
  );

/**
 * Radix item meta
 *
 * Name over a muted line, cut short instead of wrapped; the error in red.
 */
const RadixItemMeta = ({ item, size, status }: ItemMetaSlotProps) => (
  <Flex direction="column" minWidth="0">
    <Text size="2" truncate>
      {item.name}
    </Text>
    <Text size="1" truncate color={item.status === "error" ? "red" : "gray"}>
      {item.status === "error" ? item.error : [size, status].filter(Boolean).join(" · ")}
    </Text>
  </Flex>
);

/**
 * Radix progress
 *
 * A thin `Progress` spanning the row, in the gray scale once the upload is
 * no longer in flight.
 */
const RadixProgress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <Progress
    size="1"
    value={Math.max(0, Math.min(100, value))}
    color={active ? undefined : "gray"}
    style={{ gridColumn: "1 / -1" }}
    {...aria}
  />
);

/**
 * Radix action
 *
 * One ghost `IconButton` for remove, retry and cancel; remove in gray, retry
 * and cancel in the accent colour.
 */
const RadixAction = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <IconButton
    size="1"
    variant="ghost"
    color={action === "remove" ? "gray" : undefined}
    disabled={disabled}
    style={{ margin: 0 }}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    {action === "remove" ? <Cross2Icon /> : action === "retry" ? <ReloadIcon /> : <StopIcon />}
  </IconButton>
);

/**
 * Radix rejections
 *
 * A red `Callout` listing the refused files, with a ghost `IconButton` to
 * dismiss it. Announced politely, so its `role` is `status`. `Callout.Text`
 * is a paragraph, so each file gets a block `<span>` rather than a `<div>`.
 */
const RadixRejections = ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
  <Callout.Root color="red" size="1" role="status">
    <Callout.Icon>
      <ExclamationTriangleIcon />
    </Callout.Icon>
    <Flex align="start" justify="between" gap="2">
      <Callout.Text>
        {rejections.map((rejection, index) => (
          <span key={`${rejection.file.name}-${index}`} style={{ display: "block" }}>
            {rejection.message}
          </span>
        ))}
      </Callout.Text>
      <IconButton size="1" variant="ghost" color="red" aria-label={dismissLabel} onClick={onDismiss} style={{ margin: 0 }}>
        <Cross2Icon />
      </IconButton>
    </Flex>
  </Callout.Root>
);

/**
 * Radix Themes components
 *
 * The slot map a Radix Themes v3 project would pass as `components`.
 */
export const radixComponents: Partial<FileUploaderComponents> = {
  Root: ({ style, ...props }: UploaderRootSlotProps) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...style }} {...props} />
  ),
  Dropzone: RadixDropzone,
  Icon: RadixIcon,
  Empty: RadixEmpty,
  Trigger: RadixTrigger,
  List: RadixList,
  Item: RadixItem,
  Thumbnail: RadixThumbnail,
  ItemMeta: RadixItemMeta,
  Progress: RadixProgress,
  Action: RadixAction,
  Rejections: RadixRejections,
};
