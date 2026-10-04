import { Autocomplete } from "slotsmith/autocomplete";
import { topics } from "../../shared/options";
import { muiComponents } from "./mui";

export default function MuiAutocomplete() {
  return (
    <Autocomplete
      multiple
      options={topics}
      optionDisabled={(topic) => !!topic.archived}
      defaultValue={["accessibility", "forms"]}
      components={muiComponents}
      aria-label="Topics"
      style={{ maxWidth: 360 }}
    />
  );
}
