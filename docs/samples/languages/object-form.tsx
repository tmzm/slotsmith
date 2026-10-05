import { DatePicker } from "slotsmith/date-picker";
import { ar } from "slotsmith/locales/ar";

// A pack passed as an object: no provider needed, and it covers this picker only.
export default function ObjectForm() {
  return (
    <div dir={ar.dir} lang={ar.code}>
      <DatePicker locale={ar} aria-label="تاريخ التسليم" />
    </div>
  );
}
