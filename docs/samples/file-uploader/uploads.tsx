import { useState } from "react";
import { FileUploader, type UploadFn } from "slotsmith/file-uploader";
import { fakeUpload } from "../shared/fake-upload";

export default function Uploads() {
  const [fail, setFail] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);

  // Any async function will do: fetch, axios, a presigned PUT. Pass `signal` on
  // so Cancel stops the request, and report progress as a percentage.
  const upload: UploadFn = (file, { signal, onProgress }) => fakeUpload(file, { signal, onProgress }, { fail });

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />
        Make the next uploads fail
      </label>
      <FileUploader
        multiple
        maxFiles={5}
        maxSize={10 * 1024 * 1024}
        // Two uploads run at once; the rest wait their turn.
        concurrency={2}
        upload={upload}
        // The URLs of the finished uploads: what a form field would store.
        onUrlsChange={setUrls}
      />
      <p>{urls.length === 0 ? "Stored: nothing yet." : `Stored: ${urls.join(", ")}`}</p>
    </div>
  );
}
