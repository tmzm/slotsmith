import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import "slotsmith/autocomplete.css";

// `value` and `label` are read by default; other shapes take getOptionValue and getOptionLabel.
const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "fig", label: "Fig" },
  { value: "mango", label: "Mango" },
  { value: "pear", label: "Pear" },
];

export default function QuickStart() {
  const [fruit, setFruit] = useState<OptionValue | null>(null);
  // aria-label names the combobox; style and className go on the root element.
  return <Autocomplete options={fruits} value={fruit} onChange={setFruit} aria-label="Fruit" style={{ maxWidth: 320 }} />;
}
