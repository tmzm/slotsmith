import { FileUploader } from "slotsmith/file-uploader";
import { fakeUpload } from "../shared/fake-upload";

export default function Compact() {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <p aria-hidden="true">Attachments</p>
      {/* A Browse button and the hint on one line, the files listed under it: no drop zone. */}
      <FileUploader
        variant="compact"
        multiple
        accept=".pdf,.docx"
        maxFiles={3}
        maxSize={10 * 1024 * 1024}
        upload={fakeUpload}
        labels={{ dropzone: "Attachments", browse: "Attach files" }}
      />
    </div>
  );
}
