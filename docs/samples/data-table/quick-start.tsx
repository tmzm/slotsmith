import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import "slotsmith/data-table.css";

type Book = { id: string; title: string; author: string; year: number };

const books: Book[] = [
  { id: "1", title: "Things Fall Apart", author: "Chinua Achebe", year: 1958 },
  { id: "2", title: "Season of Migration to the North", author: "Tayeb Salih", year: 1966 },
  { id: "3", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", year: 1969 },
  { id: "4", title: "Beloved", author: "Toni Morrison", year: 1987 },
  { id: "5", title: "The Remains of the Day", author: "Kazuo Ishiguro", year: 1989 },
  { id: "6", title: "Wolf Hall", author: "Hilary Mantel", year: 2009 },
];

const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "author", header: "Author" },
  { accessorKey: "year", header: "Year" },
];

export default function QuickStart() {
  // Sorting is on for every column; pagination shows 10 rows a page by default.
  return <DataTable data={books} columns={columns} getRowId={(book) => book.id} />;
}
