import { useState } from "react";
import { DataTable } from "slotsmith/data-table";
import { DatePicker } from "slotsmith/date-picker";
import { SlotsmithProvider } from "slotsmith/provider";
import { shadcnComponents as autocomplete } from "../adapters/autocomplete/shadcn";
import { shadcnComponents as dataTable } from "../adapters/data-table/shadcn";
import { shadcnComponents as datePicker } from "../adapters/date-picker/shadcn";
import { productColumns, products } from "../shared/products";

export default function SpreadsheetShadcn() {
  const [rows, setRows] = useState(products);

  // One provider skins the table, and the autocomplete and date picker its select and date cells open.
  return (
    <SlotsmithProvider components={{ dataTable, autocomplete, datePicker }}>
      <DataTable
        value={rows}
        onValueChange={(next) => setRows(next)}
        columns={productColumns}
        getRowId={(product) => product.id}
        spreadsheet={{ datePicker: DatePicker }}
        enablePagination={false}
      />
    </SlotsmithProvider>
  );
}
