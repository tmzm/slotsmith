import { useState } from "react";
import { addDays, DatePicker, type DateRange } from "slotsmith/date-picker";
import { useToday } from "../../shared/today";
import { chakraComponents } from "./chakra";

export default function ChakraDatePicker() {
  const today = useToday();
  const [stay, setStay] = useState<DateRange | null>(() => ({ from: addDays(today, 2), to: addDays(today, 5) }));

  return (
    <DatePicker
      mode="range"
      value={stay}
      onChange={setStay}
      presets={[
        { label: "Next 7 days", value: { from: today, to: addDays(today, 6) } },
        { label: "Tomorrow", value: addDays(today, 1) },
      ]}
      components={chakraComponents}
      placeholder="Pick your dates"
      aria-label="Stay"
    />
  );
}
