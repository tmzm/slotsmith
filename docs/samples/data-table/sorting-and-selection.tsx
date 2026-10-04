import { useState } from "react";
import { DataTable, type DataTableColumnDef, type DataTableSortingState } from "slotsmith/data-table";
import { people, type Person } from "../shared/people";

const columns: DataTableColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "team", header: "Team" },
  // A column that should not sort opts out.
  { accessorKey: "status", header: "Status", enableSorting: false },
];

const rows = people.slice(0, 6);

export default function SortingAndSelection() {
  const [sorting, setSorting] = useState<DataTableSortingState>([]);
  const [selection, setSelection] = useState<Person[]>([]);
  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(person) => person.id}
        sorting={sorting}
        onSortingChange={setSorting}
        // Shift-click a second header to sort by both columns.
        enableMultiSort
        // People on leave cannot be selected: their checkbox is disabled.
        enableRowSelection={(row) => row.original.status !== "On leave"}
        selection={selection}
        onSelectionChange={setSelection}
        enablePagination={false}
      />
      <p>
        {sorting.length === 0
          ? "Not sorted."
          : `Sorted by: ${sorting.map((sort) => `${sort.id} ${sort.desc ? "descending" : "ascending"}`).join(", ")}`}
      </p>
      <p>{selection.length === 0 ? "No rows selected." : `Selected: ${selection.map((person) => person.name).join(", ")}`}</p>
    </>
  );
}
