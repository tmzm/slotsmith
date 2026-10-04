import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";

type Order = { id: string; item: string; quantity: number; amount: number };

const orders: Order[] = [
  { id: "1", item: "Desk lamp", quantity: 2, amount: 120 },
  { id: "2", item: "Office chair", quantity: 1, amount: 340 },
  { id: "3", item: "Notebooks", quantity: 6, amount: 85.5 },
  { id: "4", item: "Monitor", quantity: 1, amount: 410 },
  { id: "5", item: "Keyboard", quantity: 3, amount: 284.5 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// A <tfoot> appears as soon as one column defines `footer`.
const columns: DataTableColumnDef<Order>[] = [
  { accessorKey: "item", header: "Item", footer: "Total" },
  {
    accessorKey: "quantity",
    header: "Quantity",
    meta: { align: "end" },
    // A footer function gets the table, so it can add up the rows it shows.
    footer: ({ table }) => table.getRowModel().rows.reduce((sum, row) => sum + row.original.quantity, 0),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { align: "end" },
    cell: ({ getValue }) => money.format(getValue<number>()),
    footer: ({ table }) => money.format(table.getRowModel().rows.reduce((sum, row) => sum + row.original.amount, 0)),
  },
];

export default function Footers() {
  return <DataTable data={orders} columns={columns} getRowId={(order) => order.id} enablePagination={false} />;
}
