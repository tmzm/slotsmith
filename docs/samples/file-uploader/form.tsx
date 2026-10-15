import { useState, type FormEvent } from "react";
import { FileUploader } from "slotsmith/file-uploader";

export default function Form() {
  const [sent, setSent] = useState<string[] | null>(null);

  // A plain form: the uploader's hidden input sends the files under "attachments".
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const files = new FormData(event.currentTarget).getAll("attachments") as File[];
    setSent(files.map((file) => file.name));
    // A real form would post here: fetch("/api/messages", { method: "POST", body: new FormData(event.currentTarget) }).
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}>
      <FileUploader name="attachments" multiple maxFiles={3} />
      <button type="submit" style={{ justifySelf: "start", background: "transparent" }}>
        Send
      </button>
      <p>{sent === null ? "Nothing sent yet." : `Sent: ${sent.join(", ") || "no files"}`}</p>
    </form>
  );
}
