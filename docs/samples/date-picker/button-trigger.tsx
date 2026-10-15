import { useId, useState } from "react";
import { DatePicker, type DateRange } from "slotsmith/date-picker";

export default function ButtonTrigger() {
  const id = useId();
  const [reminder, setReminder] = useState<string | null>(null);
  const [trip, setTrip] = useState<DateRange | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 288 }}>
      <div>
        <p id={`${id}-reminder`}>Reminder</p>
        {/* One button: it shows the date as "Mar 12, 2026" and opens the calendar when pressed. */}
        <DatePicker trigger="button" aria-labelledby={`${id}-reminder`} value={reminder} onChange={setReminder} />
      </div>

      <div>
        <p id={`${id}-trip`}>Trip</p>
        <DatePicker
          trigger="button"
          mode="range"
          aria-labelledby={`${id}-trip`}
          placeholder="Pick your dates"
          format={{ day: "numeric", month: "long" }}
          value={trip}
          onChange={setTrip}
        />
      </div>
    </div>
  );
}
