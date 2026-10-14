import { useState, type CSSProperties } from "react";
import { DataTable, type DataTableColumnDef, type DataTableValueChange } from "slotsmith/data-table";
import { DatePicker } from "slotsmith/date-picker";

type Product = {
  id: string;
  name: string;
  category: "hardware" | "software" | "service";
  price: number;
  stock: number;
  active: boolean;
  launch: string | null;
};

const products: Product[] = [
  { id: "p1", name: "Keyboard", category: "hardware", price: 49.0, stock: 120, active: true, launch: "2026-02-03" },
  { id: "p2", name: "Monitor", category: "hardware", price: 219.5, stock: 34, active: true, launch: "2026-03-17" },
  { id: "p3", name: "Licence", category: "software", price: 99.0, stock: 500, active: false, launch: null },
  { id: "p4", name: "Support plan", category: "service", price: 15.0, stock: 0, active: true, launch: "2026-05-01" },
  { id: "p5", name: "Dock", category: "hardware", price: 129.9, stock: 12, active: true, launch: "2026-06-22" },
  { id: "p6", name: "Install", category: "service", price: 60.0, stock: 8, active: false, launch: "2026-07-09" },
];

const categories = [
  { value: "hardware", label: "Hardware" },
  { value: "software", label: "Software" },
  { value: "service", label: "Service" },
] as const;

// `edit` is typed from each accessorKey: `price` gets a number, `category` the union.
const columns: DataTableColumnDef<Product>[] = [
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
    edit: {
      parse: (text) => Number(text.replace(/[^\d.-]/g, "")),
      format: (price) => price.toFixed(2),
      validate: (price) => (Number.isNaN(price) ? "Enter a price" : price < 0 ? "Must be positive" : null),
    },
  },
  { accessorKey: "stock", header: "Stock", meta: { align: "end" }, edit: true },
  { accessorKey: "active", header: "Active", edit: { editor: "checkbox" } },
  { accessorKey: "launch", header: "Launch", edit: { editor: "date", empty: null } },
];

// The page's own text colour, so the button reads in light and dark themes.
const resetStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: "1px solid", borderRadius: 4, padding: "0.125rem 0.625rem" };

export default function Spreadsheet() {
  // The table does not change its rows itself: the rows live here.
  const [rows, setRows] = useState(products);
  const [change, setChange] = useState<DataTableValueChange<Product> | null>(null);

  return (
    <>
      <DataTable
        value={rows}
        onValueChange={(next, details) => {
          setRows(next);
          setChange(details);
        }}
        columns={columns}
        getRowId={(product) => product.id}
        // The date column opens the slotsmith DatePicker; without it, the browser's date input.
        spreadsheet={{ datePicker: DatePicker }}
        enablePagination={false}
      />
      <p>
        <button
          type="button"
          style={resetStyle}
          onClick={() => {
            setRows(products);
            setChange(null);
          }}
        >
          Reset
        </button>{" "}
        <span dir="ltr">
          {change
            ? `Last change: ${change.source}, rows ${change.rows.map((row) => row.rowId).join(", ")}`
            : "Click a cell and type, paste from a spreadsheet, or drag the corner square."}
        </span>
      </p>
    </>
  );
}
