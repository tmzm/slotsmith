import { DatePicker } from "slotsmith/date-picker";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fr } from "slotsmith/locales/fr";

// Each string is resolved on its own: the English default, then the
// provider's locale, then the component's own locale (which replaces the
// provider's whole), then the `labels` prop. The pickers use the button
// trigger, which shows the placeholder label.
export default function Precedence() {
  return (
    <SlotsmithProvider locale="fr" locales={[ar, fr]}>
      <div style={{ display: "grid", gap: "0.75rem", justifyItems: "start" }}>
        {/* French, from the provider. */}
        <DatePicker trigger="button" aria-label="Date de départ" />
        <div dir="rtl" style={{ display: "grid", gap: "0.75rem", justifyItems: "start" }}>
          {/* Arabic: the component's own locale replaces the provider's. */}
          <DatePicker trigger="button" locale={ar} aria-label="تاريخ المغادرة" />
          {/* Arabic, except the one string `labels` replaces. */}
          <DatePicker trigger="button" locale={ar} labels={{ placeholder: "تاريخ الوصول" }} aria-label="تاريخ الوصول" />
        </div>
      </div>
    </SlotsmithProvider>
  );
}
