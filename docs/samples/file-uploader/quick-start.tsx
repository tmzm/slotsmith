import { useState } from "react";
import { FileUploader } from "slotsmith/file-uploader";
import "slotsmith/file-uploader.css";

export default function QuickStart() {
  // With no `upload` prop nothing is sent: you get the picked File objects.
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <FileUploader multiple accept="image/*,.pdf" maxSize={5 * 1024 * 1024} onFilesChange={setFiles} />
      <p>{files.length === 0 ? "No files picked." : `Picked: ${files.map((file) => file.name).join(", ")}`}</p>
    </div>
  );
}
