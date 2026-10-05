import { useState } from "react";
import { FileUploader } from "slotsmith/file-uploader";
import { fakeUpload } from "../shared/fake-upload";

/** The record being edited, as the server returned it: images are stored URLs. */
const product = { id: 42, images: ["/samples/avatar.jpg"] };

export default function EditingARecord() {
  // What the form would save: the URLs that are left, plus the new uploads'.
  const [images, setImages] = useState<string[]>(product.images);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <FileUploader
        multiple
        accept="image/*"
        maxFiles={4}
        // The stored URLs become finished items, with previews for images.
        defaultValue={product.images}
        upload={fakeUpload}
        onUrlsChange={setImages}
      />
      <p>Saves images: {images.length ? images.join(", ") : "none"}</p>
    </div>
  );
}
