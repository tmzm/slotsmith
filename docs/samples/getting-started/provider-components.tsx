import type { ReactNode } from "react";
import { SlotsmithProvider, type SlotsmithComponents } from "slotsmith/provider";
import { shadcnComponents as dataTable } from "../adapters/data-table/shadcn";
import { shadcnComponents as datePicker } from "../adapters/date-picker/shadcn";

// One map per component, each the same object that component's own
// `components` prop takes. Defined outside any component, so its identity
// never changes between renders.
const components: SlotsmithComponents = { dataTable, datePicker };

// Every data table and date picker inside renders with the adapter's parts.
export function Providers({ children }: { children: ReactNode }) {
  return <SlotsmithProvider components={components}>{children}</SlotsmithProvider>;
}
