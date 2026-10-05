import { useState } from "react";
import { addDays, DatePicker, type DatePickerPreset, type DateRange } from "slotsmith/date-picker";
import { useToday } from "../shared/today";

export default function Presets() {
  const today = useToday();
  const [stay, setStay] = useState<DateRange | null>(null);

  const presets: DatePickerPreset[] = [
    { label: "Next 7 days", value: { from: today, to: addDays(today, 6) } },
    { label: "Next 30 days", value: { from: today, to: addDays(today, 29) } },
    // A single date in range mode picks that one day as both ends.
    { label: "Tomorrow", value: addDays(today, 1) },
  ];

  return (
    <div style={{ display: "grid", gap: "0.5rem", maxWidth: 288 }}>
      <DatePicker mode="range" value={stay} onChange={setStay} presets={presets} placeholder="Pick your dates" aria-label="Stay" />
      <p>Stay: {stay?.from ? `${stay.from} to ${stay.to ?? "…"}` : "none"}</p>
    </div>
  );
}
