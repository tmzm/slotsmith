import { useState, type FormEvent } from "react";
import { FileUploader, formatBytes } from "slotsmith/file-uploader";

export default function Picker() {
  // No `upload` prop: nothing is sent, and the value is plain File objects.
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The files go out with the rest of the form, in one request you control.
    const body = new FormData();
    for (const file of files) body.append("attachments", file);
    // A real form would now call: fetch("/api/reports", { method: "POST", body });
    void body;
    setSent(files.length ? files.map((file) => `${file.name} (${formatBytes(file.size)})`).join(", ") : "no files");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
      <FileUploader
        multiple
        accept=".csv,.xlsx,.pdf"
        maxFiles={3}
        onFilesChange={setFiles}
        labels={{ title: "Drop a spreadsheet or a PDF, or browse", hint: () => "CSV, Excel or PDF · up to 3 files · sent on submit" }}
      />
      <div>
        <button type="submit" style={{ background: "transparent" }}>
          Send the form
        </button>
      </div>
      <p>{sent === null ? "Nothing sent yet." : `The form would send: ${sent}.`}</p>
    </form>
  );
}
