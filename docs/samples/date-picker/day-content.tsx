import { useState, type CSSProperties } from "react";
import { addDays, DatePicker, type CalendarDay, type DatePickerComponents, type DateRange, type ISODate } from "slotsmith/date-picker";
import { useToday } from "../shared/today";

/** A made-up nightly price for a date, the same on every render. */
const fare = (date: ISODate) => 60 + ((Number(date.slice(8)) * 37 + Number(date.slice(5, 7)) * 11) % 90);

/** What a stay costs: every night from the first date up to, not including, the last. */
function total(from: ISODate, to: ISODate) {
  let sum = 0;
  for (let night = from; night < to; night = addDays(night, 1)) sum += fare(night);
  return sum;
}

/** One part replaced: DayContent receives the day, so the price goes under its number. */
const components: Partial<DatePickerComponents> = {
  DayContent: ({ day, disabled }) => (
    <span style={{ display: "grid", justifyItems: "center", lineHeight: 1.05 }}>
      <span>{day.day}</span>
      {day.outside || disabled ? null : (
        <span dir="ltr" style={{ fontSize: "0.5625rem" }}>
          ${fare(day.date)}
        </span>
      )}
    </span>
  ),
};

/** Taller cells and a wider popup, so the price fits under the date; nights under $90 are bold. */
const slotProps = {
  root: { style: { "--sdp-cell": "2.5rem" } as CSSProperties },
  popup: { style: { width: "21rem" } },
  // Per-day DOM props for the day button.
  day: (day: CalendarDay) => (fare(day.date) < 90 ? { style: { fontWeight: 700 } } : {}),
};

export default function DayContent() {
  const today = useToday();
  const [stay, setStay] = useState<DateRange | null>(null);

  return (
    <div style={{ display: "grid", gap: "0.5rem", maxWidth: 288 }}>
      <DatePicker
        mode="range"
        value={stay}
        onChange={setStay}
        minDate={today}
        components={components}
        slotProps={slotProps}
        placeholder="Pick your dates"
        aria-label="Stay"
      />
      <p>{stay?.from && stay.to ? `Total: $${total(stay.from, stay.to)}` : "Pick two dates to see the total."}</p>
    </div>
  );
}
