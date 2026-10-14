import { useState } from "react";
import { DataTable } from "slotsmith/data-table";
import { DatePicker } from "slotsmith/date-picker";
import { SlotsmithProvider } from "slotsmith/provider";
import { muiComponents as autocomplete } from "../adapters/autocomplete/mui";
import { muiComponents as dataTable } from "../adapters/data-table/mui";
import { muiComponents as datePicker } from "../adapters/date-picker/mui";
import { productColumns, products } from "../shared/products";

export default function SpreadsheetMui() {
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
