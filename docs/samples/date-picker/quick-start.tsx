import { useState } from "react";
import { DatePicker, type ISODate } from "slotsmith/date-picker";
import "slotsmith/date-picker.css";

export default function QuickStart() {
  // A date is a "YYYY-MM-DD" string, or null when nothing is picked.
  const [due, setDue] = useState<ISODate | null>(null);
  // aria-label names the combobox; style and className go on the root element.
  return <DatePicker value={due} onChange={setDue} aria-label="Due date" />;
}
