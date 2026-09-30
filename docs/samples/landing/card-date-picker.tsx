import { DatePicker } from "slotsmith/date-picker";
import { useSlotsmithLocale } from "slotsmith/provider";

export default function CardDatePicker() {
  const label = useSlotsmithLocale().code.startsWith("ar") ? "الإقامة" : "Stay";
  return <DatePicker mode="range" defaultValue={{ from: "2026-10-05", to: "2026-10-09" }} aria-label={label} />;
}
