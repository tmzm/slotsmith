import { DatePicker } from "slotsmith/date-picker";
import { useSlotsmithLocale } from "slotsmith/provider";

export default function CardDatePicker() {
  const label = useSlotsmithLocale().code.startsWith("ar") ? "الإقامة" : "Stay";
  // No clear button: at 20px it misses the 24px target size (see docs/LAUNCH-REPORT.md).
  return <DatePicker mode="range" defaultValue={{ from: "2026-10-05", to: "2026-10-09" }} clearable={false} aria-label={label} />;
}
