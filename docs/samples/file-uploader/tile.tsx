import { FileUploader } from "slotsmith/file-uploader";
import { fakeUpload } from "../shared/fake-upload";

export default function Tile() {
  return (
    <div style={{ display: "grid", gap: "0.5rem", justifyItems: "start" }}>
      <p aria-hidden="true">Profile photo</p>
      {/* One square: the picked image replaces the drop zone at once, from a local preview. */}
      <FileUploader
        variant="tile"
        accept="image/*"
        maxSize={5 * 1024 * 1024}
        upload={fakeUpload}
        // The zone is a button; this label is its accessible name.
        labels={{ dropzone: "Profile photo", title: "Add a photo" }}
      />
    </div>
  );
}
