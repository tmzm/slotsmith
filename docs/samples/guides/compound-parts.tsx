import { DataTable, useDataTableContext } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// Reads the same model as the table, from inside the provider.
function Summary() {
  const { selection, table } = useDataTableContext();
  return (
    <p>
      {selection.length} of {table.getCoreRowModel().rows.length} selected
    </p>
  );
}

// The default layout is Root > Table + Pagination. Here the pagination sits on
// top and a summary line follows the table, all inside the root.
export default function CompoundParts() {
  return (
    <DataTable.Provider data={people} columns={columns} enableRowSelection defaultPagination={{ pageIndex: 0, pageSize: 4 }}>
      <DataTable.Root>
        <DataTable.Pagination />
        <DataTable.Table />
        <Summary />
      </DataTable.Root>
    </DataTable.Provider>
  );
}
