/**
 * File uploader
 *
 * Drop or browse files, validate them, preview images, and upload with
 * progress, retry and cancellation — or leave `upload` out and it is a picker
 * that never touches the network.
 *
 * @example
 * ```tsx
 * import { FileUploader } from "slotsmith";
 *
 * <FileUploader multiple accept="image/*" upload={uploadToApi} />;
 * ```
 */

export {
  FileUploader,
  FileUploaderProvider,
  FileUploaderRoot,
  splitFileUploaderProps,
} from "./FileUploader";
export type {
  FileUploaderProps,
  FileUploaderProviderProps,
  FileUploaderRootProps,
  FileUploaderVariant,
} from "./FileUploader";

export {
  FileUploaderActions,
  FileUploaderCompact,
  FileUploaderDropzone,
  FileUploaderItemView,
  FileUploaderList,
  FileUploaderRejections,
  mergeProps as mergeFileUploaderProps,
} from "./parts";
export type {
  FileUploaderActionsProps,
  FileUploaderDropzoneProps,
  FileUploaderItemViewProps,
} from "./parts";

export {
  useFileUploader,
  getFiles,
  getUrls,
  itemFromFile,
  itemFromUrl,
  toItems,
} from "./core/useFileUploader";
export type {
  FileUploaderModel,
  InitialValue,
  UseFileUploaderOptions,
} from "./core/useFileUploader";

export { formatBytes, isAccepted, isImage, screenFiles, defaultValidationLabels } from "./core/validate";
export type { Constraints, ValidationLabels } from "./core/validate";

export type {
  Rejection,
  RejectionReason,
  UploadContext,
  UploadFn,
  UploadItem,
  UploadResult,
  UploadStatus,
} from "./core/types";

export { useFileUploaderContext, useUploadItem } from "./slots/context";
export type { FileUploaderContextValue } from "./slots/context";

export { fileUploaderFallbacks, defaultFileUploaderLabels } from "./slots/fallbacks";
export type * from "./slots/types";
