import { useMemo, useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, type Country } from "../shared/options";

/** Each country's region, the name of the group it joins. */
const regions: Record<string, string> = {
  ar: "Americas", br: "Americas", ca: "Americas", mx: "Americas", us: "Americas",
  eg: "Africa", ke: "Africa", ma: "Africa", za: "Africa",
  in: "Asia", jp: "Asia", jo: "Asia", sa: "Asia", ae: "Asia", tr: "Asia",
  fr: "Europe", de: "Europe", nl: "Europe", no: "Europe", pt: "Europe", es: "Europe", se: "Europe", gb: "Europe",
};

export default function Groups() {
  const [byRegion, setByRegion] = useState(true);
  const [country, setCountry] = useState<OptionValue | null>(null);

  // Groups appear in the order of their first option, so sorting the options sets the group order.
  const options = useMemo(
    () => (byRegion ? [...countries].sort((a, b) => (regions[a.code] ?? "").localeCompare(regions[b.code] ?? "")) : countries),
    [byRegion],
  );

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <label>
        <input type="checkbox" checked={byRegion} onChange={(event) => setByRegion(event.target.checked)} /> Sort by region
      </label>
      <Autocomplete<Country>
        options={options}
        getOptionValue={(entry) => entry.code}
        getOptionLabel={(entry) => entry.name}
        // The group's name is also its label. Australia has none, so it sits in an unlabelled section.
        getOptionGroup={(entry) => regions[entry.code]}
        value={country}
        onChange={setCountry}
        aria-label="Country"
      />
      <p>{country === null ? "Nothing selected." : `Selected: ${country}`}</p>
    </div>
  );
}
