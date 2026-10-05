import { useId, useState } from "react";
import { DatePicker, useDatePickerContext, type ISODate } from "slotsmith/date-picker";

/** Anything inside the provider reads the picker's state through the context. */
function DaysSummary() {
  const { selectedDates, clear } = useDatePickerContext();
  if (selectedDates.length === 0) return <p>No days picked.</p>;
  return (
    <p>
      {selectedDates.length} {selectedDates.length === 1 ? "day" : "days"} picked{" "}
      <button type="button" onClick={clear} style={{ background: "transparent" }}>
        Clear
      </button>
    </p>
  );
}

export default function CompoundParts() {
  const labelId = useId();
  const [daysOff, setDaysOff] = useState<ISODate[]>([]);

  return (
    <DatePicker.Provider mode="multiple" value={daysOff} onChange={setDaysOff} placeholder="Pick days">
      <DatePicker.Root style={{ display: "grid", gap: "0.5rem" }}>
        <label id={labelId}>Days off</label>
        <DatePicker.Trigger aria-labelledby={labelId} />
        <DatePicker.Popup />
        <DaysSummary />
      </DatePicker.Root>
    </DatePicker.Provider>
  );
}
