import { FileUploader } from "slotsmith/file-uploader";

// The zone stays a click and drop target, but not a button of its own: the
// Browse button inside it is the one control, so no button nests in another
// (see docs/LAUNCH-REPORT.md).
const zone = { role: undefined, tabIndex: -1 };

export default function CardFileUploader() {
  return <FileUploader slotProps={{ dropzone: zone }} />;
}
