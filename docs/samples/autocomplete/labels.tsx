import { Autocomplete } from "slotsmith/autocomplete";
import { de } from "slotsmith/locales/de";

const cities = [
  { value: "berlin", label: "Berlin" },
  { value: "hamburg", label: "Hamburg" },
  { value: "koeln", label: "Köln" },
  { value: "leipzig", label: "Leipzig" },
  { value: "muenchen", label: "München" },
];

export default function Labels() {
  return (
    <Autocomplete
      options={cities}
      // Every string in German, from the ready-made pack…
      locale={de}
      // …except these two, replaced for this picker only.
      labels={{ placeholder: "Stadt wählen…", empty: "Keine Stadt gefunden" }}
      aria-label="Stadt"
      style={{ maxWidth: 320 }}
    />
  );
}
