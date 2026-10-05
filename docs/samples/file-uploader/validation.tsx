import { FileUploader, useFileUploaderContext } from "slotsmith/file-uploader";

const KB = 1024;
const MB = 1024 * KB;

/** A file made in the page, so each rule can be tried without finding one on disk. */
const make = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

/** Buttons that add made-up files, as a drop would. Inside the provider, so they can call `add`. */
function TryFiles() {
  const { add } = useFileUploaderContext();
  const tries = [
    { label: "A 6 MB photo", files: () => [make("holiday.jpg", "image/jpeg", 6 * MB)] },
    { label: "A text file", files: () => [make("notes.txt", "text/plain", 2 * KB)] },
    { label: "An empty image", files: () => [make("blank.png", "image/png", 10)] },
    { label: "A draft", files: () => [make("cover-draft.png", "image/png", 80 * KB)] },
    {
      label: "Four photos",
      files: () => ["one", "two", "three", "four"].map((name) => make(`${name}.jpg`, "image/jpeg", 120 * KB)),
    },
  ];

  return (
    <div role="group" aria-label="Try a file" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {tries.map((entry) => (
        <button key={entry.label} type="button" onClick={() => add(entry.files())} style={{ background: "transparent" }}>
          {entry.label}
        </button>
      ))}
    </div>
  );
}

export default function Validation() {
  return (
    <FileUploader.Provider
      multiple
      // The same tokens as the native input: extensions, MIME types or `image/*`.
      accept="image/png,image/jpeg"
      // Sizes are in bytes.
      maxSize={5 * MB}
      minSize={1 * KB}
      // The most items the list may hold, counting the ones already in it.
      maxFiles={3}
      // Your own rule: return a message to refuse the file.
      validate={(file) => (file.name.includes("draft") ? `${file.name} is a draft. Upload the final version.` : null)}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <TryFiles />
        <FileUploader.Root>
          <FileUploader.Dropzone />
          <FileUploader.List />
          <FileUploader.Rejections />
        </FileUploader.Root>
      </div>
    </FileUploader.Provider>
  );
}
