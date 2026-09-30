import { DataTable, type DataTableColumnDef } from "slotsmith";

type Order = { id: string; customer: string; items: number; status: string };

const orders: Order[] = [
  { id: "1042", customer: "Lena Park", items: 3, status: "Shipped" },
  { id: "1043", customer: "Omar Haddad", items: 1, status: "Packing" },
  { id: "1044", customer: "Sofia Reyes", items: 5, status: "Shipped" },
  { id: "1045", customer: "Yuki Tanaka", items: 2, status: "Paid" },
  { id: "1046", customer: "Amir Nasser", items: 4, status: "Packing" },
];

const columns: DataTableColumnDef<Order>[] = [
  { accessorKey: "id", header: "Order" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "items", header: "Items" },
  { accessorKey: "status", header: "Status" },
];

export default function HeroTable() {
  return <DataTable data={orders} columns={columns} />;
}
