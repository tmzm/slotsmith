import { flexRender } from "@tanstack/react-table";
import { useDataTable } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// No slots, no markup: the hook gives the state and the TanStack instance,
// and the list below is entirely this file's own.
export default function HeadlessHooks() {
  const { table, status } = useDataTable({ data: people, columns, defaultPagination: { pageIndex: 0, pageSize: 3 } });
  if (status === "empty") return <p>No people</p>;
  return (
    <ul>
      {table.getRowModel().rows.map((row) => (
        <li key={row.id}>
          {row.getAllCells().map((cell) => (
            <span key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())} </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
