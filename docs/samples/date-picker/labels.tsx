import { DatePicker } from "slotsmith/date-picker";
import { de } from "slotsmith/locales/de";

export default function Labels() {
  return (
    <DatePicker
      mode="multiple"
      // Every string in German, from the ready-made pack; month and weekday names come from Intl…
      locale={de}
      // …except these two, replaced for this picker only.
      labels={{ openCalendar: "Kalender zeigen", today: "Heute anzeigen" }}
      aria-label="Urlaubstage"
    />
  );
}
