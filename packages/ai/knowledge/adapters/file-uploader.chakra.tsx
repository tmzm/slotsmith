/**
 * FileUploader for Chakra UI
 *
 * A `components` map that renders the slotsmith file uploader with Chakra UI
 * primitives, tested against Chakra UI v3. Copy the file, keep the parts you
 * want, and pass the map as `components={chakraFileUploader}`; every slot left
 * out keeps its fallback.
 */
import { Alert, Avatar, Box, Button, CloseButton, IconButton, List, Progress, Text } from "@chakra-ui/react";
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
 * Chakra file uploader parts
 *
 * Built from Chakra UI v3 primitives — `Box`, `Button`, `IconButton`,
 * `Avatar`, `Progress`, `Alert` — not from a Chakra upload recipe, which does
 * not exist as a shared primitive in the library.
 */

/**
 * Chakra dropzone
 *
 * A dashed `Box`, styled off the `data-*` attributes the part already
 * carries.
 */
const ChakraDropzone = (props: DropzoneSlotProps) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    gap="2"
    p="8"
    textAlign="center"
    borderWidth="1px"
    borderStyle="dashed"
    borderRadius="md"
    cursor="pointer"
    css={{
      "&:hover": { borderColor: "colorPalette.solid" },
      "&[data-dragging]": { borderStyle: "solid", borderColor: "colorPalette.solid", bg: "colorPalette.subtle" },
      "&[data-disabled]": { cursor: "not-allowed", opacity: 0.55 },
    }}
    {...props}
  />
);

/**
 * Chakra item
 *
 * `List.Item` laid out as a grid so the progress bar can span it.
 */
const ChakraItem = (props: UploaderItemSlotProps) => (
  <List.Item
    listStyleType="none"
    display="grid"
    gridTemplateColumns="auto minmax(0, 1fr) auto"
    alignItems="center"
    columnGap="3"
    rowGap="1"
    py="2"
    borderBottomWidth="1px"
    css={{ "&:last-of-type": { borderBottomWidth: 0 }, "&[data-status=error]": { borderColor: "border.error" } }}
    {...props}
  />
);

/**
 * Chakra thumbnail
 *
 * `Avatar.Root` holding the preview; Chakra's own avatar machine falls back
 * to `Avatar.Fallback` whenever there is no image or it fails to load, so
 * this slot only decides whether to offer a `src` at all.
 */
const ChakraThumbnail = ({ src, isImage, alt }: ThumbnailSlotProps) => (
  <Avatar.Root size="md" shape="rounded">
    {isImage && src && <Avatar.Image src={src} alt={alt} />}
    <Avatar.Fallback>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" width="16" height="16">
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      </svg>
    </Avatar.Fallback>
  </Avatar.Root>
);

/**
 * Chakra item meta
 *
 * Name over a secondary line, truncated instead of wrapped.
 */
const ChakraItemMeta = ({ item, size, status }: ItemMetaSlotProps) => (
  <Box minW="0">
    <Text truncate fontSize="sm">
      {item.name}
    </Text>
    <Text truncate fontSize="xs" color={item.status === "error" ? "fg.error" : "fg.muted"}>
      {item.status === "error" ? item.error : [size, status].filter(Boolean).join(" · ")}
    </Text>
  </Box>
);

/**
 * Chakra progress
 *
 * `Progress.Root` in determinate mode, spanning the row.
 */
const ChakraProgress = ({ value, active, ...aria }: UploaderProgressSlotProps) => (
  <Progress.Root
    value={value}
    min={0}
    max={100}
    size="xs"
    gridColumn="1 / -1"
    data-active={active || undefined}
    {...aria}
  >
    <Progress.Track>
      <Progress.Range />
    </Progress.Track>
  </Progress.Root>
);

/**
 * Chakra action
 *
 * One ghost `IconButton` for remove, retry and cancel.
 */
const ChakraAction = ({ action, onClick, disabled, ...aria }: UploaderActionSlotProps) => (
  <IconButton
    size="xs"
    variant="ghost"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    {...aria}
  >
    {action === "remove" ? "✕" : action === "retry" ? "⟳" : "■"}
  </IconButton>
);

/**
 * Chakra components
 *
 * The slot map a Chakra UI v3 project would pass as `components`.
 */
export const chakraFileUploader: Partial<FileUploaderComponents> = {
  Root: (props: UploaderRootSlotProps) => <Box display="flex" flexDirection="column" gap="3" {...props} />,
  Dropzone: ChakraDropzone,
  Icon: ({ dragging }: UploaderIconSlotProps) => (
    <Box color={dragging ? "colorPalette.solid" : "fg.muted"} display="flex">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" width="24" height="24">
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    </Box>
  ),
  Empty: ({ title, hint }: UploaderEmptySlotProps) => (
    <Box>
      <Text fontSize="sm" fontWeight="medium">
        {title}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {hint}
      </Text>
    </Box>
  ),
  Trigger: ({ onClick, disabled, children }: UploaderTriggerSlotProps) => (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  ),
  List: (props: UploaderListSlotProps) => <List.Root gap="0" p="0" m="0" {...props} />,
  Item: ChakraItem,
  Thumbnail: ChakraThumbnail,
  ItemMeta: ChakraItemMeta,
  Progress: ChakraProgress,
  Action: ChakraAction,
  Rejections: ({ rejections, onDismiss, dismissLabel }: RejectionsSlotProps) => (
    <Alert.Root status="error" role="status">
      <Alert.Content>
        {rejections.map((rejection, index) => (
          <Alert.Description key={`${rejection.file.name}-${index}`}>{rejection.message}</Alert.Description>
        ))}
      </Alert.Content>
      <CloseButton size="xs" aria-label={dismissLabel} onClick={onDismiss} />
    </Alert.Root>
  ),
};
