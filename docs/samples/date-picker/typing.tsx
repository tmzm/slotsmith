import { useId, useState } from "react";
import { DatePicker } from "slotsmith/date-picker";

export default function Typing() {
  const id = useId();
  const [due, setDue] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 288 }}>
      <div>
        <label htmlFor={`${id}-due`}>Due date</label>
        {/* The default: type the date, or open the calendar from the button. */}
        <DatePicker id={`${id}-due`} value={due} onChange={setDue} />
      </div>

      <div>
        <label htmlFor={`${id}-check-in`}>Check-in</label>
        {/* The calendar opens as soon as the field is focused or clicked. */}
        <DatePicker id={`${id}-check-in`} openOnFocus value={checkIn} onChange={setCheckIn} />
      </div>

      <p dir="ltr">Due: {due ?? "none"}</p>
    </div>
  );
}
