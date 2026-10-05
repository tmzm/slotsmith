import { useId, useState } from "react";
import { addDays, DatePicker, type DateRange, type ISODate } from "slotsmith/date-picker";
import { useToday } from "../shared/today";

export default function Overview() {
  const dueLabel = useId();
  const stayLabel = useId();
  const today = useToday();
  const [due, setDue] = useState<ISODate | null>(null);
  const [stay, setStay] = useState<DateRange | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 288 }}>
      <div>
        <p id={dueLabel}>Due date</p>
        {/* One date. Picking it closes the calendar. */}
        <DatePicker value={due} onChange={setDue} aria-labelledby={dueLabel} />
      </div>
      <div>
        <p id={stayLabel}>Stay</p>
        {/* A range from today on, with two shortcuts under the grid. */}
        <DatePicker
          mode="range"
          value={stay}
          onChange={setStay}
          minDate={today}
          presets={[
            { label: "Next 7 days", value: { from: today, to: addDays(today, 6) } },
            { label: "Tomorrow", value: addDays(today, 1) },
          ]}
          placeholder="Pick your dates"
          aria-labelledby={stayLabel}
        />
      </div>
      <div>
        <p>Due: {due ?? "none"}</p>
        <p>Stay: {stay?.from ? `${stay.from} to ${stay.to ?? "…"}` : "none"}</p>
      </div>
    </div>
  );
}
