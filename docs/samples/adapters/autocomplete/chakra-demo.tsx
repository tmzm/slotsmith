import { Autocomplete } from "slotsmith/autocomplete";
import { topics } from "../../shared/options";
import { chakraComponents } from "./chakra";

export default function ChakraAutocomplete() {
  return (
    <Autocomplete
      multiple
      options={topics}
      optionDisabled={(topic) => !!topic.archived}
      defaultValue={["accessibility", "forms"]}
      components={chakraComponents}
      aria-label="Topics"
      style={{ maxWidth: 360 }}
    />
  );
}
