import TableRow from "@mui/material/TableRow";
import { DataTable } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// Row is an element part: TableRow takes the <tr> props as is.
export default function ElementPart() {
  return (
    <DataTable
      data={people}
      columns={columns}
      components={{ Row: TableRow }}
    />
  );
}
