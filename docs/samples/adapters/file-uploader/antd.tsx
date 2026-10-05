/**
 * FileUploader for Ant Design
 *
 * A `components` map that renders the slotsmith file uploader with Ant Design
 * primitives, tested against Ant Design v6. Copy the file, keep the parts you
 * want, and pass the map as `components={antdComponents}`; every slot left
 * out keeps its fallback.
 */
import { CloseOutlined, FileOutlined, InboxOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Flex, Progress, Typography, theme } from "antd";
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
} from "slotsmith/file-uploader";

/**
 * Ant Design file uploader parts
 *
 * Built from Ant Design v6 primitives — `Button`, `Avatar`, `Progress`,
 * `Alert`, `Typography` and Ant's icons — not from Ant's own `Upload`, which
 * is a competing engine rather than a set of parts. The element parts take
 * the look of Ant's dragger and upload list from the theme's tokens; their
 * state arrives as `data-*` props, so each part reads its own and picks the
 * matching token.
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
 * Ant dropzone
 *
 * Ant's dragger: a dashed, lightly filled panel whose border turns primary
 * while a file is over it.
 */
function AntDropzone({ style, ...props }: DropzoneSlotProps) {
  const { token } = theme.useToken();
  const dragging = has(props, "data-dragging");
  const disabled = has(props, "data-disabled");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: token.paddingXS,
        padding: token.paddingLG,
        textAlign: "center",
        background: token.colorFillAlter,
        border: `${token.lineWidth}px dashed ${dragging ? token.colorPrimary : token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : undefined,
        transition: `border-color ${token.motionDurationSlow}`,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Ant icon
 *
 * The dragger's inbox, in the primary colour while a file is over the zone.
 */
function AntIcon({ dragging }: UploaderIconSlotProps) {
  const { token } = theme.useToken();
  return (
    <span aria-hidden="true" style={{ display: "flex", fontSize: token.fontSizeHeading2, color: dragging ? token.colorPrimary : token.colorTextSecondary }}>
      <InboxOutlined />
    </span>
  );
}

/**
 * Ant empty
 *
 * The dragger's title over its secondary hint.
 */
const AntEmpty = ({ title, hint }: UploaderEmptySlotProps) => (
  <Flex vertical>
    <Typography.Text strong>{title}</Typography.Text>
    <Typography.Text type="secondary">{hint}</Typography.Text>
  </Flex>
);

/**
 * Ant trigger
 *
 * A small `Button`. The click is stopped so it does not also reach the drop
 * zone and open the dialog twice.
 */
const AntTrigger = ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
  <Button
    size="small"
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
 * Ant list
 *
 * The `<ul>` of Ant's upload list.
 */
const AntList = ({ style, ...props }: UploaderListSlotProps) => (
  <ul style={{ margin: 0, padding: 0, listStyle: "none", ...style }} {...props} />
);

/**
 * Ant item
 *
 * A row of Ant's picture list: a grid so the progress bar can span it, and
 * the error colour on the border of a failed file.
 */
function AntItem({ style, ...props }: UploaderItemSlotProps) {
  const { token } = theme.useToken();
  const failed = (props as Record<string, unknown>)["data-status"] === "error";
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "center",
        columnGap: token.paddingSM,
        rowGap: token.paddingXS,
        marginTop: token.marginXS,
        padding: token.paddingXS,
        border: `${token.lineWidth}px ${token.lineType} ${failed ? token.colorError : token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Ant thumbnail
 *
 * A square `Avatar` holding the preview, or a file icon.
 */
const AntThumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) =>
  isImage && src ? (
    <Avatar shape="square" size={40} src={src} alt={alt} />
  ) : (
    <Avatar shape="square" size={40} icon={<FileOutlined aria-hidden="true" />} />
  );

/**
 * Ant item meta
 *
 * Name over a secondary line, cut short instead of wrapped; the error in the
 * danger colour.
 */
const AntItemMeta = ({ item, size, status }: ItemMetaSlotProps) => {
  const line = { display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } as const;
  return (
    <div style={{ minWidth: 0 }}>
      <Typography.Text style={line}>{item.name}</Typography.Text>
      <Typography.Text type={item.status === "error" ? "danger" : "secondary"} style={{ ...line, fontSize: "0.85em" }}>
        {item.status === "error" ? item.error : [size, status].filter(Boolean).join(" · ")}
      </Typography.Text>
    </div>
  );
};

/**
 * Ant progress
 *
 * A thin line `Progress` without its number, spanning the row, animated
 * while the upload is in flight.
 */
const AntProgress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <Progress
    percent={Math.max(0, Math.min(100, value))}
    size="small"
    showInfo={false}
    status={active ? "active" : "normal"}
    style={{ gridColumn: "1 / -1", margin: 0 }}
    {...aria}
  />
);

/**
 * Ant action
 *
 * One text `Button` for remove, retry and cancel; retry and cancel in the
 * primary colour. Ant's `color` prop is a palette, which is why the slot
 * passes no DOM `color`.
 */
const AntAction = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <Button
    size="small"
    variant="text"
    color={action === "remove" ? "default" : "primary"}
    disabled={disabled}
    icon={action === "remove" ? <CloseOutlined /> : action === "retry" ? <ReloadOutlined /> : <StopOutlined />}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  />
);

/**
 * Ant rejections
 *
 * An error `Alert` listing the refused files. Announced politely, so `role`
 * is `status` rather than Ant's default `alert`; the `closable` object names
 * the close button.
 */
const AntRejections = ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
  <Alert
    type="error"
    showIcon
    role="status"
    closable={{ onClose: onDismiss, "aria-label": dismissLabel }}
    title={rejections.map((rejection, index) => (
      <div key={`${rejection.file.name}-${index}`}>{rejection.message}</div>
    ))}
  />
);

/**
 * Ant Design components
 *
 * The slot map an Ant Design v6 project would pass as `components`.
 */
export const antdComponents: Partial<FileUploaderComponents> = {
  Root: ({ style, ...props }: UploaderRootSlotProps) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, ...style }} {...props} />
  ),
  Dropzone: AntDropzone,
  Icon: AntIcon,
  Empty: AntEmpty,
  Trigger: AntTrigger,
  List: AntList,
  Item: AntItem,
  Thumbnail: AntThumbnail,
  ItemMeta: AntItemMeta,
  Progress: AntProgress,
  Action: AntAction,
  Rejections: AntRejections,
};
