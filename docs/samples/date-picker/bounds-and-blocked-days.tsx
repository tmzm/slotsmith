import { useId, useState } from "react";
import { addMonths, DatePicker, fromISODate, type ISODate } from "slotsmith/date-picker";
import { useToday } from "../shared/today";

/** Saturday or Sunday, read from the date itself. */
const isWeekend = (date: ISODate) => {
  const day = fromISODate(date)?.getDay();
  return day === 0 || day === 6;
};

export default function BoundsAndBlockedDays() {
  const id = useId();
  const today = useToday();
  const [visit, setVisit] = useState<ISODate | null>(null);

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 288 }}>
      <div>
        <p id={`${id}-visit`}>Appointment</p>
        <DatePicker
          value={visit}
          onChange={setVisit}
          // Nothing before today or more than two months ahead; the calendar stops at both months.
          minDate={today}
          maxDate={addMonths(today, 2)}
          // Weekends stay focusable and are announced, but cannot be picked.
          disabledDates={isWeekend}
          aria-labelledby={`${id}-visit`}
        />
        <p>Appointment: {visit ?? "none"}</p>
      </div>
      <div>
        <p id={`${id}-locked`}>Confirmed on</p>
        {/* `disabled` turns off the whole control, not single days. */}
        <DatePicker disabled defaultValue="2026-03-12" aria-labelledby={`${id}-locked`} />
      </div>
    </div>
  );
}
