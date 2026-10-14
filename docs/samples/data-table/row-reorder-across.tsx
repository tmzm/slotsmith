import { useState, type CSSProperties } from "react";
import { DataTable, type DataTableColumnDef, type RowOrderChange } from "slotsmith/data-table";

type Task = { id: string; title: string; owner: string; parts?: Task[] };

const project: Task[] = [
  {
    id: "t1",
    title: "Design",
    owner: "Omar Haddad",
    parts: [
      { id: "t1.1", title: "Sketch the flows", owner: "Priya Nair" },
      { id: "t1.2", title: "Review with support", owner: "Jonas Weber" },
    ],
  },
  {
    id: "t2",
    title: "Build",
    owner: "Lena Park",
    parts: [
      { id: "t2.1", title: "Database changes", owner: "Diego Alvarez" },
      { id: "t2.2", title: "API endpoints", owner: "Lena Park" },
    ],
  },
  { id: "t3", title: "Launch", owner: "Hana Kim" },
];

// Sorting is off: this table is ordered by hand.
const columns: DataTableColumnDef<Task>[] = [
  { accessorKey: "title", header: "Task", enableSorting: false },
  { accessorKey: "owner", header: "Owner", enableSorting: false },
];

// The page's own text colour, so the button reads in light and dark themes.
const resetStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: "1px solid", borderRadius: 4, padding: "0.125rem 0.625rem" };

export default function RowReorderAcross() {
  const [rows, setRows] = useState(project);
  const [change, setChange] = useState<RowOrderChange<Task> | null>(null);

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(task) => task.id}
        getSubRows={(task) => task.parts}
        // How the table writes new children into a copy of a row, to build the new tree.
        setSubRows={(task, parts) => ({ ...task, parts })}
        defaultExpanded
        enableRowReorder
        reorderAcrossParents
        // Launch stays a top-level task.
        canDrop={(move) => move.rowId !== "t3" || move.parentId === null}
        onRowOrderChange={(next) => {
          // Across parents, `data` is the whole new tree.
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
            setRows(project);
            setChange(null);
          }}
        >
          Reset
        </button>{" "}
        <span dir="ltr">
          {change
            ? `Last move: { rowId: "${change.rowId}", fromParentId: ${JSON.stringify(change.fromParentId)}, parentId: ${JSON.stringify(change.parentId)}, index: ${change.index} }`
            : "Drag a task sideways to move it in or out a level."}
        </span>
      </p>
    </>
  );
}
