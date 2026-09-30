import { DataTable, type DataTableColumnDef } from "slotsmith/data-table";
import { useSlotsmithLocale } from "slotsmith/provider";

type Task = { id: string; task: string; owner: string; due: string };

const copy = {
  en: {
    headers: { task: "Task", owner: "Owner", due: "Due" },
    rows: [
      { id: "1", task: "Ship v2", owner: "Lena", due: "Oct 3" },
      { id: "2", task: "Fix export", owner: "Omar", due: "Oct 6" },
      { id: "3", task: "Audit forms", owner: "Sofia", due: "Oct 9" },
      { id: "4", task: "Plan Q4", owner: "Yuki", due: "Oct 14" },
    ],
  },
  ar: {
    headers: { task: "المهمة", owner: "المسؤول", due: "الموعد" },
    rows: [
      { id: "1", task: "إطلاق الإصدار 2", owner: "لينا", due: "3 أكتوبر" },
      { id: "2", task: "إصلاح التصدير", owner: "عمر", due: "6 أكتوبر" },
      { id: "3", task: "مراجعة النماذج", owner: "صوفيا", due: "9 أكتوبر" },
      { id: "4", task: "خطة الربع الرابع", owner: "يوكي", due: "14 أكتوبر" },
    ],
  },
};

export default function CardDataTable() {
  const { headers, rows } = useSlotsmithLocale().code.startsWith("ar") ? copy.ar : copy.en;
  const columns: DataTableColumnDef<Task>[] = [
    { accessorKey: "task", header: headers.task },
    { accessorKey: "owner", header: headers.owner },
    { accessorKey: "due", header: headers.due, enableSorting: false },
  ];
  return <DataTable data={rows} columns={columns} enablePagination={false} />;
}
