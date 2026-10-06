import { useState } from "react";
import { DataTable, type CheckboxSlotProps } from "slotsmith/data-table";
import { DatePicker, type DpIconProps, type ISODate } from "slotsmith/date-picker";
import { SlotsmithProvider, type SlotsmithComponents } from "slotsmith/provider";
import { columns, people } from "../shared/people";

// A widget part of the app's own: a checkbox drawn as a button.
function Check({ radius, checked, indeterminate, disabled, onCheckedChange, "aria-label": label }: CheckboxSlotProps & { radius: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      style={{ inlineSize: "1.5rem", blockSize: "1.5rem", padding: 0, border: "1.5px solid currentColor", borderRadius: radius, background: "transparent", color: "inherit", lineHeight: 1, cursor: "pointer" }}
    >
      {indeterminate ? "–" : checked ? "✓" : ""}
    </button>
  );
}

const RoundCheckbox = (props: CheckboxSlotProps) => <Check {...props} radius="50%" />;
const SquareCheckbox = (props: CheckboxSlotProps) => <Check {...props} radius="4px" />;

// The date picker's icon: a diamond that fills while the calendar is open.
const DiamondIcon = ({ open }: DpIconProps) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill={open ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M12 3 21 12 12 21 3 12Z" />
  </svg>
);

// One map per component, defined outside any component so it keeps its identity.
const components: SlotsmithComponents = {
  dataTable: { Checkbox: RoundCheckbox },
  datePicker: { Icon: DiamondIcon },
};

// The second table's own prop: it wins over the provider for this slot only.
const squareCheckbox = { Checkbox: SquareCheckbox };

// Three people and three columns keep the two tables short.
const team = people.slice(0, 3);
const teamColumns = columns.slice(0, 3);

export default function ProviderComponents() {
  const [day, setDay] = useState<ISODate | null>(null);

  return (
    <SlotsmithProvider components={components}>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ maxInlineSize: "18rem" }}>
          <DatePicker value={day} onChange={setDay} placeholder="Pick a date" aria-label="Start date" />
        </div>
        <p style={{ margin: 0 }}>Set on the provider: round.</p>
        <DataTable data={team} columns={teamColumns} enableRowSelection hidePagination />
        <p style={{ margin: 0 }}>Set on this table: square.</p>
        <DataTable data={team} columns={teamColumns} enableRowSelection hidePagination components={squareCheckbox} />
      </div>
    </SlotsmithProvider>
  );
}
