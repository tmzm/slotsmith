import { DataTable, type CellSlotProps, type RowSlotProps } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// An element part gets the element's own props. Spread all of them: they
// carry the data-* state, the handlers and the ARIA attributes.
function Row({ className, ...props }: RowSlotProps) {
  return <tr {...props} className={["app-row", className].filter(Boolean).join(" ")} />;
}

function Cell(props: CellSlotProps) {
  return <td {...props} className="app-cell" />;
}

export default function ElementPart() {
  return <DataTable data={people} columns={columns} components={{ Row, Cell }} />;
}
