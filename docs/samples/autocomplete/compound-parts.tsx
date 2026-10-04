import { useId, useState } from "react";
import { Autocomplete, useAutocompleteContext, type OptionValue } from "slotsmith/autocomplete";
import { topics, type Topic } from "../shared/options";

/** Anything inside the provider reads the picker's state through the context. */
function SelectionSummary() {
  const { values, clear } = useAutocompleteContext<Topic>();
  if (values.length === 0) return <p>Nothing selected.</p>;
  return (
    <p>
      {values.length} selected{" "}
      <button type="button" onClick={clear} style={{ background: "transparent" }}>
        Clear
      </button>
    </p>
  );
}

export default function CompoundParts() {
  const labelId = useId();
  const [topicIds, setTopicIds] = useState<OptionValue[]>([]);

  return (
    <Autocomplete.Provider multiple options={topics} optionDisabled={(topic) => !!topic.archived} value={topicIds} onChange={setTopicIds}>
      <Autocomplete.Root style={{ display: "grid", gap: "0.5rem", maxWidth: 360 }}>
        <label id={labelId}>Topics</label>
        <Autocomplete.Trigger aria-labelledby={labelId} />
        <Autocomplete.Popup />
        <Autocomplete.LiveRegion />
        <SelectionSummary />
      </Autocomplete.Root>
    </Autocomplete.Provider>
  );
}
