import { DataTable, type DataTableColumnDef } from "slotsmith";

type Part = { name: string; kind: string; slots: number };

const parts: Part[] = [
  { name: "DataTable", kind: "table", slots: 22 },
  { name: "Autocomplete", kind: "combobox", slots: 17 },
  { name: "DatePicker", kind: "date", slots: 13 },
];

const columns: DataTableColumnDef<Part>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "kind", header: "Kind" },
  { accessorKey: "slots", header: "Slots" },
];

export default function HelloTable() {
  return <DataTable data={parts} columns={columns} />;
}
