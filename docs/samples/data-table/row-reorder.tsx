import { useState, type CSSProperties } from "react";
import { DataTable, type DataTableColumnDef, type RowOrderChange } from "slotsmith/data-table";

type Step = { id: string; title: string; owner: string; estimate: string };

const plan: Step[] = [
  { id: "s1", title: "Write the release notes", owner: "Lena Park", estimate: "2h" },
  { id: "s2", title: "Freeze the main branch", owner: "Yuki Tanaka", estimate: "15m" },
  { id: "s3", title: "Run the full test suite", owner: "Diego Alvarez", estimate: "1h" },
  { id: "s4", title: "Tag the version", owner: "Yuki Tanaka", estimate: "5m" },
  { id: "s5", title: "Publish the package", owner: "Sofia Reyes", estimate: "10m" },
  { id: "s6", title: "Announce the release", owner: "Omar Haddad", estimate: "30m" },
];

// Sorting is off: a sorted view keeps its order after a drop, so a table
// ordered by hand should not also sort.
const columns: DataTableColumnDef<Step>[] = [
  { accessorKey: "title", header: "Step", enableSorting: false },
  { accessorKey: "owner", header: "Owner", enableSorting: false },
  { accessorKey: "estimate", header: "Estimate", enableSorting: false },
];

// The page's own text colour, so the button reads in light and dark themes.
const resetStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: "1px solid", borderRadius: 4, padding: "0.125rem 0.625rem" };

export default function RowReorder() {
  // The table does not reorder itself: the order lives here.
  const [rows, setRows] = useState(plan);
  const [change, setChange] = useState<RowOrderChange<Step> | null>(null);

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(step) => step.id}
        enableRowReorder
        onRowOrderChange={(next) => {
          // Store the new order in the same event; save it to a server after.
          setRows(next.data);
          setChange(next);
        }}
        enablePagination={false}
      />
      <p>
        <button
          type="button"
          style={resetStyle}
          onClick={() => {
            setRows(plan);
            setChange(null);
          }}
        >
          Reset
        </button>{" "}
        <span dir="ltr">
          {change
            ? `Last move: { rowId: "${change.rowId}", targetId: "${change.targetId}", position: "${change.position}" }`
            : "Drag a handle, or focus one and press Space."}
        </span>
      </p>
    </>
  );
}
