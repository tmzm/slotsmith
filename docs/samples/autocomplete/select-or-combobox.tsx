import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, type Country } from "../shared/options";

export default function SelectOrCombobox() {
  const [searchable, setSearchable] = useState(true);
  const [country, setCountry] = useState<OptionValue | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <label>
        <input type="checkbox" checked={searchable} onChange={(event) => setSearchable(event.target.checked)} /> <code>searchable</code>
      </label>
      <Autocomplete<Country>
        options={countries}
        getOptionValue={(entry) => entry.code}
        getOptionLabel={(entry) => entry.name}
        // true: a search box filters the list. false: no search box; typing jumps to the first match.
        searchable={searchable}
        value={country}
        onChange={setCountry}
        aria-label="Country"
      />
      <p>{country === null ? "Nothing selected." : `Selected: ${country}`}</p>
    </div>
  );
}
