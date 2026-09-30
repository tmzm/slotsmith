import { useState } from "react";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { SlotsmithProvider, useSlotsmithLocale } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";
import { fa } from "slotsmith/locales/fa";

type Order = { id: string; customer: string; city: string; status: string };

const LANGUAGES = [
  { locale: "en-US", lang: "en", name: "English" },
  { locale: "ar", lang: "ar", name: "العربية" },
  { locale: "fa", lang: "fa", name: "فارسی" },
] as const;

type Locale = (typeof LANGUAGES)[number]["locale"];

const packs = [ar, fa];

/** The toggle's name, in the page's language. */
const GROUP_LABEL: Record<string, string> = { en: "Language", ar: "اللغة", fa: "زبان" };

const copy: Record<Locale, { headers: Record<"customer" | "city" | "status", string>; rows: Order[] }> = {
  "en-US": {
    headers: { customer: "Customer", city: "City", status: "Status" },
    rows: [
      { id: "1", customer: "Lena Park", city: "Berlin", status: "Paid" },
      { id: "2", customer: "Omar Haddad", city: "Amman", status: "Shipped" },
      { id: "3", customer: "Sofia Reyes", city: "Madrid", status: "Packing" },
      { id: "4", customer: "Yuki Tanaka", city: "Osaka", status: "Paid" },
      { id: "5", customer: "Amir Nasser", city: "Tehran", status: "Shipped" },
      { id: "6", customer: "Nadia Karimi", city: "Dubai", status: "Packing" },
    ],
  },
  ar: {
    headers: { customer: "العميل", city: "المدينة", status: "الحالة" },
    rows: [
      { id: "1", customer: "لينا بارك", city: "برلين", status: "مدفوع" },
      { id: "2", customer: "عمر حداد", city: "عمّان", status: "تم الشحن" },
      { id: "3", customer: "صوفيا رييس", city: "مدريد", status: "قيد التجهيز" },
      { id: "4", customer: "يوكي تاناكا", city: "أوساكا", status: "مدفوع" },
      { id: "5", customer: "أمير ناصر", city: "طهران", status: "تم الشحن" },
      { id: "6", customer: "نادية كريمي", city: "دبي", status: "قيد التجهيز" },
    ],
  },
  fa: {
    headers: { customer: "مشتری", city: "شهر", status: "وضعیت" },
    rows: [
      { id: "1", customer: "لنا پارک", city: "برلین", status: "پرداخت‌شده" },
      { id: "2", customer: "عمر حداد", city: "امان", status: "ارسال‌شده" },
      { id: "3", customer: "سوفیا ری‌یس", city: "مادرید", status: "در حال بسته‌بندی" },
      { id: "4", customer: "یوکی تاناکا", city: "اوساکا", status: "پرداخت‌شده" },
      { id: "5", customer: "امیر ناصر", city: "تهران", status: "ارسال‌شده" },
      { id: "6", customer: "نادیا کریمی", city: "دبی", status: "در حال بسته‌بندی" },
    ],
  },
};

/** The table in the provider's language, inside an element that takes its direction. */
function Orders({ locale }: { locale: Locale }) {
  const { dir } = useSlotsmithLocale();
  const { headers, rows } = copy[locale];
  const columns: DataTableColumnDef<Order>[] = [
    { accessorKey: "customer", header: headers.customer },
    { accessorKey: "city", header: headers.city },
    { accessorKey: "status", header: headers.status },
  ];
  return (
    <div dir={dir} lang={locale}>
      <DataTable data={rows} columns={columns} defaultPagination={{ pageIndex: 0, pageSize: 5 }} pageSizeOptions={[5, 10]} />
    </div>
  );
}

export default function Languages() {
  // Starts in the page's language when an outer provider sets one.
  const page = useSlotsmithLocale().code;
  const label = GROUP_LABEL[page.split("-")[0]!] ?? "Language";
  const [locale, setLocale] = useState<Locale>(page.startsWith("ar") ? "ar" : page.startsWith("fa") ? "fa" : "en-US");

  return (
    <div className="languages-demo">
      <div role="group" aria-label={label}>
        {LANGUAGES.map((language) => (
          <button
            key={language.locale}
            type="button"
            lang={language.lang}
            aria-pressed={locale === language.locale}
            onClick={() => setLocale(language.locale)}
          >
            {language.name}
          </button>
        ))}
      </div>
      <SlotsmithProvider locale={locale} locales={packs}>
        <Orders locale={locale} />
      </SlotsmithProvider>
    </div>
  );
}
