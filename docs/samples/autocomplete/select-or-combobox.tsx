import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, type Country } from "../shared/options";

export default function SelectOrCombobox() {
  const [searchable, setSearchable] = useState(true);
  const [autoHighlight, setAutoHighlight] = useState(false);
  const [country, setCountry] = useState<OptionValue | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
        <label>
          <input type="checkbox" checked={searchable} onChange={(event) => setSearchable(event.target.checked)} /> <code>searchable</code>
        </label>
        <label>
          <input type="checkbox" checked={autoHighlight} onChange={(event) => setAutoHighlight(event.target.checked)} /> <code>autoHighlight</code>
        </label>
      </div>
      <Autocomplete<Country>
        options={countries}
        getOptionValue={(entry) => entry.code}
        getOptionLabel={(entry) => entry.name}
        // true: a search box filters the list. false: no search box; typing jumps to the first match.
        searchable={searchable}
        // true: the first match is highlighted as the list opens and narrows, so Enter picks it.
        autoHighlight={autoHighlight}
        value={country}
        onChange={setCountry}
        aria-label="Country"
      />
      <p>{country === null ? "Nothing selected." : `Selected: ${country}`}</p>
    </div>
  );
}
