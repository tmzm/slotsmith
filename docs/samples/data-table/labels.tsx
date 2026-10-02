import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { de } from "slotsmith/locales/de";

type Book = { id: string; title: string; author: string; year: number };

const books: Book[] = [
  { id: "1", title: "Der Process", author: "Franz Kafka", year: 1925 },
  { id: "2", title: "Effi Briest", author: "Theodor Fontane", year: 1896 },
  { id: "3", title: "Der Steppenwolf", author: "Hermann Hesse", year: 1927 },
  { id: "4", title: "Buddenbrooks", author: "Thomas Mann", year: 1901 },
  { id: "5", title: "Momo", author: "Michael Ende", year: 1973 },
];

const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Titel" },
  { accessorKey: "author", header: "Autor" },
  { accessorKey: "year", header: "Jahr" },
];

export default function Labels() {
  return (
    <DataTable
      data={books}
      columns={columns}
      // Every string in German, from the ready-made pack…
      locale={de}
      // …except the page counter, replaced for this table only.
      labels={{ pageInfo: (page, pageCount) => `${page} / ${pageCount}` }}
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
      pageSizeOptions={[3, 5]}
    />
  );
}
