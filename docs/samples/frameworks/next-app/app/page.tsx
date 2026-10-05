import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { LanguageToggle } from "./providers";

type Book = { title: string; author: string; year: number };

const books: Book[] = [
  { title: "Things Fall Apart", author: "Chinua Achebe", year: 1958 },
  { title: "Season of Migration to the North", author: "Tayeb Salih", year: 1966 },
  { title: "Beloved", author: "Toni Morrison", year: 1987 },
];

// Plain objects, so this server component can pass them to the table.
const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "author", header: "Author" },
  { accessorKey: "year", header: "Year" },
];

export default function Page() {
  return (
    <main>
      <LanguageToggle />
      <DataTable data={books} columns={columns} />
    </main>
  );
}
