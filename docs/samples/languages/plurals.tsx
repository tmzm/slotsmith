import { useState } from "react";
import { createPlural, type PluralForms } from "slotsmith/locale";

// One string per plural category the language uses; `{count}` is replaced by
// the number, written the way the tag writes numbers. Only `other` is required.
const SELECTED: Record<string, { name: string; forms: PluralForms }> = {
  en: {
    name: "English",
    forms: { one: "{count} row selected", other: "{count} rows selected" },
  },
  ru: {
    name: "Русский",
    forms: {
      one: "Выбрана {count} строка",
      few: "Выбраны {count} строки",
      many: "Выбрано {count} строк",
      other: "Выбрано {count} строки",
    },
  },
  ar: {
    name: "العربية",
    forms: {
      zero: "لم يُحدَّد أي صف",
      one: "تم تحديد صف واحد",
      two: "تم تحديد صفّين",
      few: "تم تحديد {count} صفوف",
      many: "تم تحديد {count} صفًّا",
      other: "تم تحديد {count} صف",
    },
  },
};

const COUNTS = [0, 1, 2, 5, 11, 100];

export default function Plurals() {
  const [code, setCode] = useState("ru");
  const [count, setCount] = useState(2);
  // createPlural picks the form through Intl.PluralRules for the tag.
  const plural = createPlural(code);
  const { forms } = SELECTED[code]!;

  return (
    <div className="languages-plurals">
      <div role="group" aria-label="Language">
        {Object.entries(SELECTED).map(([tag, { name }]) => (
          <button key={tag} type="button" lang={tag} aria-pressed={tag === code} onClick={() => setCode(tag)}>
            {name}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Count">
        {COUNTS.map((value) => (
          <button key={value} type="button" aria-pressed={value === count} onClick={() => setCount(value)}>
            {value}
          </button>
        ))}
      </div>
      <output lang={code} dir={code === "ar" ? "rtl" : "ltr"} aria-live="polite">
        {plural(count, forms)}
      </output>
    </div>
  );
}
