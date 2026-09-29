import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
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
 * MUI file uploader parts
 *
 * Built from MUI v7 primitives — `Paper`, `IconButton`, `Avatar`, `List`,
 * `ListItem`, `LinearProgress`, `Chip`-adjacent `Alert` — not from MUI's own
 * upload component, which does not exist as a shared primitive in the library.
 */

/** A small inline icon, so the skin doesn't pull in `@mui/icons-material`. */
const Glyph = ({ path, size = 20 }: { path: ReactNode; size?: number }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
    sx={{ width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.8 }}
  >
    {path}
  </Box>
);

/**
 * MUI dropzone
 *
 * An outlined `Paper` that switches to a solid, tinted border while dragging.
 */
const MuiDropzone = (props: DropzoneSlotProps) => (
  <Paper
    variant="outlined"
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      p: 4,
      textAlign: "center",
      borderStyle: "dashed",
      cursor: "pointer",
      transition: "border-color 150ms, background-color 150ms",
      "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
      "&[data-dragging]": { borderStyle: "solid", borderColor: "primary.main", bgcolor: "action.selected" },
      "&[data-disabled]": { cursor: "not-allowed", opacity: 0.55 },
    }}
    {...props}
  />
);

/**
 * MUI item
 *
 * A `ListItem` laid out as a grid so the progress bar can span it.
 */
const MuiItem = (props: UploaderItemSlotProps) => (
  <ListItem
    divider
    sx={{
      display: "grid",
      gridTemplateColumns: "auto minmax(0, 1fr) auto",
      alignItems: "center",
      columnGap: 1.5,
      rowGap: 1,
      "&[data-status=error]": { borderColor: "error.main" },
    }}
    {...props}
  />
);

/**
 * MUI thumbnail
 *
 * A rounded `Avatar` holding the preview, or a file glyph.
 */
const MuiThumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) => (
  <Avatar variant="rounded" src={isImage && src ? src : undefined} alt={alt} sx={{ width: 40, height: 40 }}>
    {(!isImage || !src) && (
      <Glyph path={<path d="M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />} />
    )}
  </Avatar>
);

/**
 * MUI item meta
 *
 * Name over a secondary line, truncated instead of wrapped.
 */
const MuiItemMeta = ({ item, size, status }: ItemMetaSlotProps) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap>
      {item.name}
    </Typography>
    <Typography
      variant="caption"
      color={item.status === "error" ? "error" : "text.secondary"}
      noWrap
      component="p"
    >
      {item.status === "error" ? item.error : [size, status].filter(Boolean).join(" · ")}
    </Typography>
  </Box>
);

/**
 * MUI progress
 *
 * `LinearProgress` in determinate mode, spanning the row.
 */
const MuiProgress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <LinearProgress
    variant="determinate"
    value={Math.max(0, Math.min(100, value))}
    data-active={active || undefined}
    sx={{ gridColumn: "1 / -1", borderRadius: 999 }}
    {...aria}
  />
);

/**
 * MUI action
 *
 * One `IconButton` for remove, retry and cancel.
 */
const MuiAction = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <IconButton
    size="small"
    disabled={disabled}
    color={action === "remove" ? "default" : "primary"}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    <Glyph
      size={18}
      path={
        action === "remove" ? (
          <path d="M18 6 6 18M6 6l12 12" />
        ) : action === "retry" ? (
          <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
        ) : (
          <rect x="6" y="6" width="12" height="12" rx="1" />
        )
      }
    />
  </IconButton>
);

/**
 * MUI components
 *
 * The slot map an MUI v7 project would pass as `components`.
 */
export const muiComponents: Partial<FileUploaderComponents> = {
  Root: (props: UploaderRootSlotProps) => <Stack spacing={1.5} {...props} />,
  Dropzone: MuiDropzone,
  Icon: ({ dragging }: UploaderIconSlotProps) => (
    <Box sx={{ color: dragging ? "primary.main" : "text.secondary", display: "flex" }}>
      <Glyph
        size={24}
        path={
          <>
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </>
        }
      />
    </Box>
  ),
  Empty: ({ title, hint }: UploaderEmptySlotProps) => (
    <Box>
      <Typography variant="body2" fontWeight={500}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </Box>
  ),
  Trigger: ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
    <Button
      size="small"
      variant="outlined"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  ),
  List: (props: UploaderListSlotProps) => <List disablePadding {...props} />,
  Item: MuiItem,
  Thumbnail: MuiThumbnail,
  ItemMeta: MuiItemMeta,
  Progress: MuiProgress,
  Action: MuiAction,
  Rejections: ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
    <Alert severity="error" onClose={onDismiss} closeText={dismissLabel} role="status">
      {rejections.map((rejection, index) => (
        <div key={`${rejection.file.name}-${index}`}>{rejection.message}</div>
      ))}
    </Alert>
  ),
};
