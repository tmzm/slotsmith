import { useId, useState } from "react";
import { DatePicker, type DateRange, type ISODate } from "slotsmith/date-picker";

export default function Modes() {
  const id = useId();
  // `mode` sets the shape of value, defaultValue and onChange.
  const [due, setDue] = useState<ISODate | null>(null);
  const [daysOff, setDaysOff] = useState<ISODate[]>([]);
  const [stay, setStay] = useState<DateRange | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 288 }}>
      <div>
        <p id={`${id}-due`}>Due date (single)</p>
        <DatePicker value={due} onChange={setDue} aria-labelledby={`${id}-due`} />
        <p>Value: {due ?? "null"}</p>
      </div>
      <div>
        <p id={`${id}-off`}>Days off (multiple)</p>
        <DatePicker mode="multiple" value={daysOff} onChange={setDaysOff} placeholder="Pick days" aria-labelledby={`${id}-off`} />
        <p>Value: {daysOff.length ? daysOff.join(", ") : "[]"}</p>
      </div>
      <div>
        <p id={`${id}-stay`}>Stay (range)</p>
        <DatePicker mode="range" value={stay} onChange={setStay} placeholder="Pick your dates" aria-labelledby={`${id}-stay`} />
        <p>Value: {stay?.from ? `${stay.from} to ${stay.to ?? "…"}` : "null"}</p>
      </div>
    </div>
  );
}
