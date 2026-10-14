import { useState } from "react";
import { createDataTableColumnHelper, DataTable, type DataTableColumnDef } from "slotsmith/data-table";

type Product = { id: string; sku: string; name: string; price: number; stock: number };

const products: Product[] = [
  { id: "p1", sku: "KB-01", name: "Keyboard", price: 49, stock: 120 },
  { id: "p2", sku: "MN-02", name: "Monitor", price: 219.5, stock: 34 },
  { id: "p3", sku: "DK-03", name: "Dock", price: 129.9, stock: 12 },
];

const columns: DataTableColumnDef<Product>[] = [
  { accessorKey: "sku", header: "SKU" },
  { accessorKey: "name", header: "Name", edit: true },
  {
    accessorKey: "price",
    header: "Price",
    edit: {
      parse: (text) => Number(text.replace(/[^\d.-]/g, "")),
      format: (price) => price.toFixed(2),
      validate: (price) => (price < 0 ? "Must be positive" : null),
    },
  },
];

// An accessor function's value is inferred by the column helper, which types `edit` too.
const column = createDataTableColumnHelper<Product>();
export const valueColumns = [
  column.accessor((row) => row.stock * row.price, {
    id: "value",
    header: "Stock value",
    edit: { setValue: (row, value) => ({ ...row, stock: Math.round(value / row.price) }) },
  }),
];

export default function SpreadsheetColumns() {
  const [rows, setRows] = useState(products);

  return <DataTable value={rows} onValueChange={(next) => setRows(next)} columns={columns} spreadsheet />;
}
