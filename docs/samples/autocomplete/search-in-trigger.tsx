import { useId, useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, topics, type Country } from "../shared/options";

export default function SearchInTrigger() {
  const [country, setCountry] = useState<OptionValue | null>("jp");
  const [topicIds, setTopicIds] = useState<OptionValue[]>(["forms"]);
  const countryId = useId();
  const topicsId = useId();

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <div style={{ display: "grid", gap: "0.375rem" }}>
        {/* The input is the combobox and takes the id, so a plain <label for> names it. */}
        <label htmlFor={countryId}>Country</label>
        <Autocomplete<Country>
          id={countryId}
          searchIn="trigger"
          options={countries}
          getOptionValue={(entry) => entry.code}
          getOptionLabel={(entry) => entry.name}
          value={country}
          onChange={setCountry}
          placeholder="Search countries"
        />
      </div>
      <div style={{ display: "grid", gap: "0.375rem" }}>
        <label htmlFor={topicsId}>Topics</label>
        {/* In multiple mode the tags sit before the input, on the same line. */}
        <Autocomplete
          id={topicsId}
          searchIn="trigger"
          multiple
          options={topics}
          optionDisabled={(topic) => !!topic.archived}
          value={topicIds}
          onChange={setTopicIds}
          placeholder="Add topics"
        />
      </div>
      <p>
        Country: {country ?? "none"}. Topics: {topicIds.length === 0 ? "none" : topicIds.join(", ")}.
      </p>
    </div>
  );
}
