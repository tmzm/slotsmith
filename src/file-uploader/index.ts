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

export { FileUploader } from "./FileUploader";
export type { FileUploaderProps, FileUploaderVariant } from "./FileUploader";

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

export { fileUploaderFallbacks, defaultFileUploaderLabels } from "./slots/fallbacks";
export type * from "./slots/types";
