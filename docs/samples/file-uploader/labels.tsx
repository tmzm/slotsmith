import { FileUploader } from "slotsmith/file-uploader";
import { de } from "slotsmith/locales/de";

export default function Labels() {
  return (
    <FileUploader
      multiple
      accept="image/*"
      maxSize={2 * 1024 * 1024}
      // Every string in German, the rejection messages included, from the ready-made pack…
      locale={de}
      // …except these, replaced for this uploader only. `labels` covers the parts' text,
      labels={{ title: "Belege hierher ziehen", browse: "Belege auswählen" }}
      // and `validationLabels` the messages for refused files.
      validationLabels={{ wrongType: (name) => `${name}: bitte nur Bilder` }}
    />
  );
}
