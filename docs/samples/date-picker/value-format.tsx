import { useState } from "react";
import { DatePicker } from "slotsmith/date-picker";

export default function ValueFormat() {
  // The value is written the way the form already stores dates.
  const [due, setDue] = useState<string | null>("15/04/2026");
  // An instant: the day starts at midnight in Tokyo, whatever the reader's own zone.
  const [launch, setLaunch] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "20rem" }}>
      <label>
        Due date
        <DatePicker valueFormat="DD/MM/YYYY" value={due} onChange={setDue} minDate="01/04/2026" />
      </label>
      <p dir="ltr">value: {JSON.stringify(due)}</p>

      <label>
        Launch (Tokyo)
        <DatePicker timeZone="Asia/Tokyo" valueFormat="iso-datetime" value={launch} onChange={setLaunch} />
      </label>
      <p dir="ltr">value: {JSON.stringify(launch)}</p>
    </div>
  );
}
