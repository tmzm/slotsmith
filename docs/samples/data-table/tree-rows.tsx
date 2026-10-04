import { useState } from "react";
import { DataTable, type DataTableColumnDef, type DataTableExpandedState } from "slotsmith/data-table";

type Unit = { id: string; name: string; lead: string; headcount: number; units?: Unit[] };

const company: Unit[] = [
  {
    id: "eng",
    name: "Engineering",
    lead: "Yuki Tanaka",
    headcount: 42,
    units: [
      {
        id: "eng-platform",
        name: "Platform",
        lead: "Lena Park",
        headcount: 18,
        units: [
          { id: "eng-platform-infra", name: "Infrastructure", lead: "Diego Alvarez", headcount: 10 },
          { id: "eng-platform-tools", name: "Developer tools", lead: "Sofia Reyes", headcount: 8 },
        ],
      },
      { id: "eng-payments", name: "Payments", lead: "Chloe Martin", headcount: 24 },
    ],
  },
  {
    id: "product",
    name: "Product",
    lead: "Omar Haddad",
    headcount: 15,
    units: [
      { id: "product-design", name: "Design", lead: "Priya Nair", headcount: 9 },
      { id: "product-research", name: "Research", lead: "Amir Nasser", headcount: 6 },
    ],
  },
  { id: "care", name: "Customer care", lead: "Hana Kim", headcount: 12 },
];

const columns: DataTableColumnDef<Unit>[] = [
  // The first column holds the expand toggle and is indented by depth.
  { accessorKey: "name", header: "Unit" },
  { accessorKey: "lead", header: "Lead" },
  { accessorKey: "headcount", header: "People", meta: { align: "end" } },
];

export default function TreeRows() {
  const [expanded, setExpanded] = useState<DataTableExpandedState>({});
  const open = expanded === true ? "all" : Object.keys(expanded).filter((id) => expanded[id]);
  return (
    <>
      <DataTable
        data={company}
        columns={columns}
        getRowId={(unit) => unit.id}
        // Each row's children: rows with any become expandable.
        getSubRows={(unit) => unit.units}
        expanded={expanded}
        onExpandedChange={setExpanded}
        enablePagination={false}
      />
      <p>{open.length === 0 ? "Every row is collapsed." : `Expanded: ${open === "all" ? "all" : open.join(", ")}`}</p>
    </>
  );
}
