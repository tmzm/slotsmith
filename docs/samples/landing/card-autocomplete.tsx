import { Autocomplete } from "slotsmith/autocomplete";
import { useSlotsmithLocale } from "slotsmith/provider";

const copy = {
  en: {
    label: "City",
    options: [
      { value: "lisbon", label: "Lisbon" },
      { value: "cairo", label: "Cairo" },
      { value: "tokyo", label: "Tokyo" },
      { value: "oslo", label: "Oslo" },
    ],
  },
  ar: {
    label: "المدينة",
    options: [
      { value: "lisbon", label: "لشبونة" },
      { value: "cairo", label: "القاهرة" },
      { value: "tokyo", label: "طوكيو" },
      { value: "oslo", label: "أوسلو" },
    ],
  },
};

export default function CardAutocomplete() {
  const { label, options } = useSlotsmithLocale().code.startsWith("ar") ? copy.ar : copy.en;
  return <Autocomplete options={options} defaultValue={["cairo"]} aria-label={label} />;
}
