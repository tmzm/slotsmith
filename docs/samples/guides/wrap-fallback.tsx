import { DataTable, fallbackComponents, type EmptySlotProps, type RowSlotProps } from "slotsmith/data-table";
import { columns } from "../shared/people";

// Keep a fallback and change one thing: add a class to the stock row.
function Row(props: RowSlotProps) {
  return <fallbackComponents.Row {...props} className={["app-row", props.className].filter(Boolean).join(" ")} />;
}

// Or put something around it: the stock empty message, with a way out under it.
function Empty(props: EmptySlotProps) {
  return (
    <>
      <fallbackComponents.Empty {...props} />
      <a href="#invite">Invite someone</a>
    </>
  );
}

export default function WrapFallback() {
  return <DataTable data={[]} columns={columns} components={{ Row, Empty }} />;
}
