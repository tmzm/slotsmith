import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { topics } from "../shared/options";

export default function Multiple() {
  const [topicIds, setTopicIds] = useState<OptionValue[]>(["accessibility", "forms"]);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <Autocomplete
        // `multiple` makes value an array and keeps the popup open on each pick.
        multiple
        options={topics}
        optionDisabled={(topic) => !!topic.archived}
        value={topicIds}
        onChange={setTopicIds}
        // Three tags show; the rest collapse into "+N".
        maxTags={3}
        aria-label="Topics"
      />
      <p>{topicIds.length === 0 ? "Nothing selected." : `Selected: ${topicIds.join(", ")}`}</p>
    </div>
  );
}
