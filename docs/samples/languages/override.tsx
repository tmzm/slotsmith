import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { ar } from "slotsmith/locales/ar";

type Order = { id: string; customer: string };

const columns: DataTableColumnDef<Order>[] = [{ accessorKey: "customer", header: "العميل" }];

// Every string from the Arabic pack, except `empty`, replaced for this table only.
export default function Override() {
  return (
    <div dir="rtl" lang="ar">
      <DataTable locale={ar} labels={{ empty: "لا توجد طلبات بعد" }} data={[]} columns={columns} />
    </div>
  );
}
