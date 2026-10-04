import { useId, useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, topics, type Country } from "../shared/options";

export default function Overview() {
  const countryLabel = useId();
  const topicsLabel = useId();
  const [country, setCountry] = useState<OptionValue | null>(null);
  const [topicIds, setTopicIds] = useState<OptionValue[]>(["accessibility", "forms"]);
  const countryName = countries.find((entry) => entry.code === country)?.name ?? "none";
  const topicNames = topics.filter((topic) => topicIds.includes(topic.id)).map((topic) => topic.label);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <div>
        <p id={countryLabel}>Country</p>
        {/* One value, filtered as you type. */}
        <Autocomplete<Country>
          options={countries}
          getOptionValue={(entry) => entry.code}
          getOptionLabel={(entry) => entry.name}
          value={country}
          onChange={setCountry}
          aria-labelledby={countryLabel}
        />
      </div>
      <div>
        <p id={topicsLabel}>Topics</p>
        {/* Several values, shown as tags; the archived topic cannot be picked. */}
        <Autocomplete
          multiple
          options={topics}
          optionDisabled={(topic) => !!topic.archived}
          value={topicIds}
          onChange={setTopicIds}
          aria-labelledby={topicsLabel}
        />
      </div>
      <div>
        <p>Country: {countryName}</p>
        <p>Topics: {topicNames.length ? topicNames.join(", ") : "none"}</p>
      </div>
    </div>
  );
}
