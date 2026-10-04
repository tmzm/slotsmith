import { Autocomplete } from "slotsmith/autocomplete";
import { topics } from "../../shared/options";
import { shadcnComponents } from "./shadcn";

export default function ShadcnAutocomplete() {
  return (
    <Autocomplete
      multiple
      options={topics}
      optionDisabled={(topic) => !!topic.archived}
      defaultValue={["accessibility", "forms"]}
      components={shadcnComponents}
      aria-label="Topics"
      style={{ maxWidth: 360 }}
    />
  );
}
