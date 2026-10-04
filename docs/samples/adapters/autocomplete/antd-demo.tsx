import { Autocomplete } from "slotsmith/autocomplete";
import { topics } from "../../shared/options";
import { antdComponents } from "./antd";

export default function AntdAutocomplete() {
  return (
    <Autocomplete
      multiple
      options={topics}
      optionDisabled={(topic) => !!topic.archived}
      defaultValue={["accessibility", "forms"]}
      components={antdComponents}
      aria-label="Topics"
      style={{ maxWidth: 360 }}
    />
  );
}
