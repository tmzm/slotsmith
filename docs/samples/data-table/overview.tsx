import { useState } from "react";
import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { people, type Person } from "../shared/people";

const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "team", header: "Team" },
  { accessorKey: "status", header: "Status", enableSorting: false },
];

export default function Overview() {
  const [selection, setSelection] = useState<Person[]>([]);
  return (
    <>
      <DataTable
        data={people}
        columns={columns}
        getRowId={(person) => person.id}
        // Shift-click a second header to sort by both columns.
        enableMultiSort
        enableRowSelection
        selection={selection}
        onSelectionChange={setSelection}
        defaultPagination={{ pageIndex: 0, pageSize: 5 }}
        pageSizeOptions={[5, 10]}
      />
      <p>{selection.length === 0 ? "No rows selected." : `Selected: ${selection.map((person) => person.name).join(", ")}`}</p>
    </>
  );
}
