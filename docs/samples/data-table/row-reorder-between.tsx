import { useState, type CSSProperties } from "react";
import { DataTable, type DataTableColumnDef, type RowTransfer } from "slotsmith/data-table";

type Card = { id: string; title: string; owner: string };

const backlog: Card[] = [
  { id: "c1", title: "Write the release notes", owner: "Lena Park" },
  { id: "c2", title: "Freeze the main branch", owner: "Yuki Tanaka" },
  { id: "c3", title: "Run the full test suite", owner: "Diego Alvarez" },
];

const doing: Card[] = [{ id: "c4", title: "Tag the version", owner: "Yuki Tanaka" }];

// Sorting is off: both tables are ordered by hand.
const columns: DataTableColumnDef<Card>[] = [
  { accessorKey: "title", header: "Card", enableSorting: false },
  { accessorKey: "owner", header: "Owner", enableSorting: false },
];

// The page's own text colour, so the button reads in light and dark themes.
const resetStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: "1px solid", borderRadius: 4, padding: "0.125rem 0.625rem" };

export default function RowReorderBetween() {
  const [todo, setTodo] = useState(backlog);
  const [inProgress, setInProgress] = useState(doing);
  const [last, setLast] = useState<RowTransfer<Card> | null>(null);

  return (
    <>
      <DataTable
        aria-label="Backlog"
        data={todo}
        columns={columns}
        getRowId={(card) => card.id}
        enableRowReorder
        // Tables with the same reorderGroup exchange rows.
        reorderGroup="board"
        reorderTableId="backlog"
        onRowOrderChange={(change) => setTodo(change.data)}
        // Called on both tables; `data` is always this table's new rows.
        onRowTransfer={(transfer) => {
          setTodo(transfer.data);
          setLast(transfer);
        }}
        enablePagination={false}
      />
      <DataTable
        aria-label="In progress"
        data={inProgress}
        columns={columns}
        getRowId={(card) => card.id}
        enableRowReorder
        reorderGroup="board"
        reorderTableId="in-progress"
        onRowOrderChange={(change) => setInProgress(change.data)}
        onRowTransfer={(transfer) => setInProgress(transfer.data)}
        enablePagination={false}
      />
      <p>
        <button
          type="button"
          style={resetStyle}
          onClick={() => {
            setTodo(backlog);
            setInProgress(doing);
            setLast(null);
          }}
        >
          Reset
        </button>{" "}
        <span dir="ltr">
          {last
            ? `Last transfer: ${last.rowIds.join(", ")} from "${last.from.tableId}" to "${last.to.tableId}" at ${last.to.index}`
            : "Drag a card into the other table, or lift one with Space and press ↓ past the last row."}
        </span>
      </p>
    </>
  );
}
