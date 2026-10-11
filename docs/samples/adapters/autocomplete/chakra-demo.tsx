import { useId } from "react";
import { Autocomplete } from "slotsmith/autocomplete";
import { countriesByRegion, type RegionCountry } from "../../shared/options";
import { chakraComponents } from "./chakra";

export default function ChakraAutocomplete() {
  const id = useId();

  return (
    <div style={{ display: "grid", gap: "0.375rem", maxWidth: 360 }}>
      {/* With the search in the trigger the input is the combobox, so a plain <label for> names it. */}
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 500 }}>
        Countries
      </label>
      <Autocomplete<RegionCountry>
        id={id}
        searchIn="trigger"
        multiple
        autoHighlight
        options={countriesByRegion}
        getOptionValue={(country) => country.code}
        getOptionLabel={(country) => country.name}
        getOptionGroup={(country) => country.region}
        optionDisabled={(country) => !!country.disabled}
        defaultValue={["dz", "jp"]}
        placeholder="Search countries"
        components={chakraComponents}
      />
    </div>
  );
}
