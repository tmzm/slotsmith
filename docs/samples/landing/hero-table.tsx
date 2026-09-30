import { DataTable, type DataTableColumnDef } from "slotsmith";
import { useSlotsmithLocale } from "slotsmith/provider";

type Order = { id: string; customer: string; items: number; status: string };

const copy = {
  en: {
    headers: { id: "Order", customer: "Customer", items: "Items", status: "Status" },
    rows: [
      { id: "1042", customer: "Lena Park", items: 3, status: "Shipped" },
      { id: "1043", customer: "Omar Haddad", items: 1, status: "Packing" },
      { id: "1044", customer: "Sofia Reyes", items: 5, status: "Shipped" },
      { id: "1045", customer: "Yuki Tanaka", items: 2, status: "Paid" },
      { id: "1046", customer: "Amir Nasser", items: 4, status: "Packing" },
    ],
  },
  ar: {
    headers: { id: "الطلب", customer: "العميل", items: "القطع", status: "الحالة" },
    rows: [
      { id: "1042", customer: "لينا بارك", items: 3, status: "تم الشحن" },
      { id: "1043", customer: "عمر حداد", items: 1, status: "قيد التجهيز" },
      { id: "1044", customer: "صوفيا رييس", items: 5, status: "تم الشحن" },
      { id: "1045", customer: "يوكي تاناكا", items: 2, status: "مدفوع" },
      { id: "1046", customer: "أمير ناصر", items: 4, status: "قيد التجهيز" },
    ],
  },
};

export default function HeroTable() {
  const { headers, rows } = useSlotsmithLocale().code.startsWith("ar") ? copy.ar : copy.en;
  const columns: DataTableColumnDef<Order>[] = [
    { accessorKey: "id", header: headers.id },
    { accessorKey: "customer", header: headers.customer },
    { accessorKey: "items", header: headers.items },
    { accessorKey: "status", header: headers.status },
  ];
  return <DataTable data={rows} columns={columns} />;
}
