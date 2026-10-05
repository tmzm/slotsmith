import {
  DataTable,
  type CellSlotProps,
  type DataTableColumnDef,
  type HeaderCellSlotProps,
  type RowSlotProps,
  type TableSlotProps,
} from "slotsmith/data-table";

type Book = { id: string; title: string; year: number };

const columns: DataTableColumnDef<Book>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "year", header: "Year" },
];

// No slotsmith stylesheet: each element part is your own element with Tailwind
// classes. A selected row carries data-state="selected".
const Table = (props: TableSlotProps) => <table {...props} className="w-full text-sm" />;
const Row = (props: RowSlotProps) => <tr {...props} className="border-b border-zinc-200 data-[state=selected]:bg-violet-50" />;
const HeaderCell = (props: HeaderCellSlotProps) => <th {...props} className="px-3 py-2 text-start font-medium text-zinc-500" />;
const Cell = (props: CellSlotProps) => <td {...props} className="px-3 py-2" />;

export function Books({ books }: { books: Book[] }) {
  return <DataTable data={books} columns={columns} components={{ Table, Row, HeaderCell, Cell }} />;
}
