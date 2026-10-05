import { useState } from "react";
import { FileUploader, type UploadItem } from "slotsmith/file-uploader";
import { fakeUpload } from "../shared/fake-upload";

export default function Overview() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fail, setFail] = useState(false);
  const done = items.filter((item) => item.status === "done").length;

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />
        Make the next uploads fail
      </label>
      {/* Up to four images or PDFs of 5 MB each, uploaded two at a time. */}
      <FileUploader
        multiple
        accept="image/*,.pdf"
        maxSize={5 * 1024 * 1024}
        maxFiles={4}
        concurrency={2}
        value={items}
        onValueChange={setItems}
        upload={(file, context) => fakeUpload(file, context, { fail })}
      />
      <p>
        {items.length === 0 ? "No files yet." : `${done} of ${items.length} ${items.length === 1 ? "file" : "files"} uploaded.`}
      </p>
    </div>
  );
}
