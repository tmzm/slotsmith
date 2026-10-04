import { useState } from "react";
import type { OptionValue } from "slotsmith/autocomplete";
import { VirtualAutocomplete } from "slotsmith/virtual";

const names = ["Ashford", "Brookfield", "Clearwater", "Dunmore", "Easton", "Fairview", "Glenwood", "Harbor City", "Ivydale", "Kingsbridge", "Lakeside", "Millbrook", "Northgate", "Oakridge", "Pinecrest", "Riverton", "Stonebridge", "Thornbury"];

// 5,000 options, built from their index so every render gets the same ones.
const cities = Array.from({ length: 5000 }, (_, index) => ({ id: index + 1, label: `${names[index % names.length]} ${index + 1}` }));

export default function Virtual() {
  const [city, setCity] = useState<OptionValue | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <VirtualAutocomplete
        options={cities}
        value={city}
        onChange={setCity}
        // Rows are 34px tall; the list scrolls inside 280px and renders only what is in view.
        virtual={{ estimateSize: 34, maxHeight: 280 }}
        aria-label="City"
      />
      <p>{city === null ? "Nothing selected." : `Selected: city #${city}`}</p>
    </div>
  );
}
