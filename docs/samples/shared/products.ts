import type { DataTableColumnDef } from "slotsmith/data-table";

export type Product = {
  id: string;
  name: string;
  category: "hardware" | "software" | "service";
  price: number;
  active: boolean;
  launch: string | null;
};

export const products: Product[] = [
  { id: "p1", name: "Keyboard", category: "hardware", price: 49, active: true, launch: "2026-02-03" },
  { id: "p2", name: "Monitor", category: "hardware", price: 219.5, active: true, launch: "2026-03-17" },
  { id: "p3", name: "Licence", category: "software", price: 99, active: false, launch: null },
  { id: "p4", name: "Support plan", category: "service", price: 15, active: true, launch: "2026-05-01" },
  { id: "p5", name: "Dock", category: "hardware", price: 129.9, active: true, launch: "2026-06-22" },
];

const categories = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "service", label: "Service" },
] as const;

/** Editable columns: text, a select, a number, a checkbox and a date. */
export const productColumns: DataTableColumnDef<Product>[] = [
  { accessorKey: "name", header: "Name", edit: { validate: (name) => (name.trim() ? null : "A name is required") } },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => categories.find((category) => category.value === getValue())?.label,
    edit: { options: categories },
  },
  {
    accessorKey: "price",
    header: "Price",
    meta: { align: "end" },
    cell: ({ getValue }) => (getValue() as number).toFixed(2),
    edit: { format: (price) => price.toFixed(2), validate: (price) => (price < 0 ? "Must be positive" : null) },
  },
  { accessorKey: "active", header: "Active", edit: { editor: "checkbox" } },
  { accessorKey: "launch", header: "Launch", edit: { editor: "date", empty: null } },
];
