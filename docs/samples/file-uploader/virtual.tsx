import type { UploadItem } from "slotsmith/file-uploader";
import { VirtualFileUploader } from "slotsmith/virtual";
import { fakeUpload } from "../shared/fake-upload";

// 300 scans already stored, built from their index so every render gets the same ones.
const scans: UploadItem[] = Array.from({ length: 300 }, (_, index) => {
  const name = `scan-${String(index + 1).padStart(3, "0")}.pdf`;
  return {
    id: name,
    name,
    size: 40_000 + ((index * 7919) % 900_000),
    type: "application/pdf",
    status: "done",
    progress: 100,
    url: `/samples/uploaded/${name}`,
  };
});

export default function Virtual() {
  return (
    <VirtualFileUploader
      multiple
      maxFiles={500}
      defaultValue={scans}
      upload={fakeUpload}
      // A fallback row is 64px tall; the list scrolls inside 320px and renders only what is in view.
      virtual={{ estimateSize: 64, maxHeight: 320 }}
      // The stylesheet makes the list a flex column, which shrinks the spacer rows to nothing;
      // a block list keeps them at their height, so the whole list scrolls (a known library issue).
      slotProps={{ list: { style: { display: "block" } } }}
    />
  );
}
