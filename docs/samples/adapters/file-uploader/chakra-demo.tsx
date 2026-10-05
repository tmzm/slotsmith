import { FileUploader } from "slotsmith/file-uploader";
import { fakeUpload } from "../../shared/fake-upload";
import { chakraComponents } from "./chakra";

export default function ChakraFileUploader() {
  return (
    <FileUploader
      multiple
      accept="image/*,.pdf"
      maxSize={5 * 1024 * 1024}
      maxFiles={4}
      // A stored image, so the item parts show before anything is picked.
      defaultValue={["/samples/avatar.jpg"]}
      upload={fakeUpload}
      components={chakraComponents}
    />
  );
}
