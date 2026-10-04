import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { topics, type Topic } from "../shared/options";

export default function Creatable() {
  const [options, setOptions] = useState<Topic[]>(topics.filter((topic) => !topic.archived));
  const [tag, setTag] = useState<OptionValue | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <Autocomplete
        options={options}
        value={tag}
        onChange={setTag}
        // A search that matches nothing offers a "Create" row; Enter or a click calls onCreate with the text.
        creatable
        onCreate={(name) => {
          const created = { id: name.toLowerCase().replace(/\s+/g, "-"), label: name };
          setOptions((all) => [created, ...all]);
          setTag(created.id);
        }}
        aria-label="Tag"
      />
      <p>{tag === null ? "Nothing selected." : `Selected: ${tag}`}</p>
    </div>
  );
}
