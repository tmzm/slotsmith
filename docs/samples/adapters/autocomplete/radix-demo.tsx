import { Autocomplete } from "slotsmith/autocomplete";
import { topics } from "../../shared/options";
import { radixComponents } from "./radix";

export default function RadixAutocomplete() {
  return (
    <Autocomplete
      multiple
      options={topics}
      optionDisabled={(topic) => !!topic.archived}
      defaultValue={["accessibility", "forms"]}
      components={radixComponents}
      aria-label="Topics"
      style={{ maxWidth: 360 }}
    />
  );
}
