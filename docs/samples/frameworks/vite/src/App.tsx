import { useEffect, useState } from "react";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { SlotsmithProvider } from "slotsmith/provider";
import { ar } from "slotsmith/locales/ar";

type Book = { title: string; author: string; year: number };

const books: Book[] = [
  { title: "Things Fall Apart", author: "Chinua Achebe", year: 1958 },
  { title: "Season of Migration to the North", author: "Tayeb Salih", year: 1966 },
  { title: "Beloved", author: "Toni Morrison", year: 1987 },
];

const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "author", header: "Author" },
  { accessorKey: "year", header: "Year" },
];

export function App() {
  const [language, setLanguage] = useState<"en" | "ar">("en");

  // The page's lang and dir follow the language, so the table and the rest of the page mirror together.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return (
    // English is the default, so it needs no pack.
    <SlotsmithProvider locale={language === "ar" ? "ar" : undefined} locales={[ar]}>
      <button type="button" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>
        {language === "en" ? "العربية" : "English"}
      </button>
      <DataTable data={books} columns={columns} />
    </SlotsmithProvider>
  );
}
