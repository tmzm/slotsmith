import { useState } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { DatePicker } from "slotsmith/date-picker";
import { FileUploader } from "slotsmith/file-uploader";
import type { SlotsmithLocale } from "slotsmith/locale";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { arEG } from "slotsmith/locales/ar-EG";
import { arIQ } from "slotsmith/locales/ar-IQ";
import { arSA } from "slotsmith/locales/ar-SA";
import { de } from "slotsmith/locales/de";
import { es } from "slotsmith/locales/es";
import { fa } from "slotsmith/locales/fa";
import { fr } from "slotsmith/locales/fr";
import { he } from "slotsmith/locales/he";
import { hi } from "slotsmith/locales/hi";
import { id } from "slotsmith/locales/id";
import { it } from "slotsmith/locales/it";
import { ja } from "slotsmith/locales/ja";
import { ko } from "slotsmith/locales/ko";
import { ptBR } from "slotsmith/locales/pt-BR";
import { ru } from "slotsmith/locales/ru";
import { tr } from "slotsmith/locales/tr";
import { zhCN } from "slotsmith/locales/zh-CN";
import { people, type Person } from "../shared/people";
import { topics } from "../shared/options";

// Each language named in itself, the way a language menu should name it.
const LANGUAGES: { pack: SlotsmithLocale | null; name: string }[] = [
  { pack: null, name: "English" },
  { pack: ar, name: "العربية" },
  { pack: arEG, name: "العربية (مصر)" },
  { pack: arIQ, name: "العربية (العراق)" },
  { pack: arSA, name: "العربية (السعودية)" },
  { pack: de, name: "Deutsch" },
  { pack: es, name: "Español" },
  { pack: fa, name: "فارسی" },
  { pack: fr, name: "Français" },
  { pack: he, name: "עברית" },
  { pack: hi, name: "हिन्दी" },
  { pack: id, name: "Bahasa Indonesia" },
  { pack: it, name: "Italiano" },
  { pack: ja, name: "日本語" },
  { pack: ko, name: "한국어" },
  { pack: ptBR, name: "Português (Brasil)" },
  { pack: ru, name: "Русский" },
  { pack: tr, name: "Türkçe" },
  { pack: zhCN, name: "简体中文" },
];

const rows = people.slice(0, 6);
const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "team", header: "Team" },
];

export default function Switcher() {
  const [pack, setPack] = useState<SlotsmithLocale | null>(null);
  const [topicIds, setTopicIds] = useState<OptionValue[]>(["accessibility", "forms"]);
  // English needs no pack: it is every component's default.
  const code = pack?.code ?? "en";
  const dir = pack?.dir ?? "ltr";

  return (
    <div className="languages-switcher">
      <div role="group" aria-label="Language of the demo">
        {LANGUAGES.map((language) => (
          <button
            key={language.pack?.code ?? "en"}
            type="button"
            lang={language.pack?.code ?? "en"}
            dir="auto"
            aria-pressed={language.pack === pack}
            onClick={() => setPack(language.pack)}
          >
            {language.name}
          </button>
        ))}
      </div>
      {/* The provider renders no element: the direction goes on an element of your own. */}
      <SlotsmithProvider locale={pack ?? "en-US"}>
        <div data-stage dir={dir} lang={code}>
          <DataTable
            data={rows}
            columns={columns}
            enableRowSelection
            defaultPagination={{ pageIndex: 0, pageSize: 3 }}
            pageSizeOptions={[3, 6]}
          />
          <div className="languages-switcher__fields">
            <Autocomplete multiple options={topics} value={topicIds} onChange={setTopicIds} maxTags={1} aria-label="Topics" />
            <DatePicker mode="range" aria-label="Stay" />
          </div>
          <FileUploader multiple accept="image/*" maxSize={2 * 1024 * 1024} maxFiles={3} />
        </div>
      </SlotsmithProvider>
    </div>
  );
}
