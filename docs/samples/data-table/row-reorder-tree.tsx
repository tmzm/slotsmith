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
      { id: "t1.3", title: "Final mockups", owner: "Omar Haddad" },
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

// Sorting is off: a sorted view keeps its order after a drop.
const columns: DataTableColumnDef<Task>[] = [
  { accessorKey: "title", header: "Task", enableSorting: false },
  { accessorKey: "owner", header: "Owner", enableSorting: false },
];

/** Gives the moved row's parent its children in their new order; the rest of the tree is unchanged. */
function placeSiblings(tasks: Task[], change: RowOrderChange<Task>): Task[] {
  return tasks.map((task) =>
    task.id === change.parentId
      ? { ...task, parts: change.siblings }
      : task.parts
        ? { ...task, parts: placeSiblings(task.parts, change) }
        : task,
  );
}

// The page's own text colour, so the button reads in light and dark themes.
const resetStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: "1px solid", borderRadius: 4, padding: "0.125rem 0.625rem" };

export default function RowReorderTree() {
  const [rows, setRows] = useState(project);
  const [change, setChange] = useState<RowOrderChange<Task> | null>(null);

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(task) => task.id}
        getSubRows={(task) => task.parts}
        defaultExpanded={{ t1: true }}
        enableRowReorder
        onRowOrderChange={(next) => {
          // A top-level row: `data` is the new order. A sub-row: `data` is
          // unchanged, and `siblings` are its parent's new children.
          setRows((current) => (next.parentId === null ? next.data : placeSiblings(current, next)));
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
            ? `Last move: { rowId: "${change.rowId}", targetId: "${change.targetId}", parentId: ${change.parentId === null ? "null" : `"${change.parentId}"`} }`
            : "Open sub-rows move with their row."}
        </span>
      </p>
    </>
  );
}
