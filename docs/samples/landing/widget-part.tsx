import Checkbox from "@mui/material/Checkbox";
import { DataTable, type CheckboxSlotProps } from "slotsmith/data-table";
import { columns, people } from "../shared/people";

// Checkbox is a widget part: told what is true, it maps
// that to MUI's own props.
function MuiCheckbox(props: CheckboxSlotProps) {
  return (
    <Checkbox
      checked={props.checked}
      indeterminate={props.indeterminate}
      disabled={props.disabled}
      onChange={(_, checked) => props.onCheckedChange(checked)}
      slotProps={{ input: { "aria-label": props["aria-label"] } }}
    />
  );
}

export default function WidgetPart() {
  return (
    <DataTable
      data={people}
      columns={columns}
      enableRowSelection
      components={{ Checkbox: MuiCheckbox }}
    />
  );
}
