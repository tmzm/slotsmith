import type { DataTableColumnDef } from "slotsmith/data-table";
import { VirtualDataTable } from "slotsmith/virtual";

type LogLine = { id: number; time: string; level: string; service: string; message: string };

const LEVELS = ["info", "info", "info", "warn", "error"];
const SERVICES = ["api", "auth", "billing", "search", "worker"];
const MESSAGES = ["Request served", "Cache refreshed", "Token renewed", "Job queued", "Retrying upstream call"];

/** 10,000 log lines, the same on every render: line i is computed from i alone. */
const lines: LogLine[] = Array.from({ length: 10_000 }, (_, i) => {
  const seconds = i * 7;
  const time = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return {
    id: i + 1,
    time,
    level: LEVELS[(i * 7) % LEVELS.length]!,
    service: SERVICES[(i * 3) % SERVICES.length]!,
    message: `${MESSAGES[(i * 11) % MESSAGES.length]} #${i + 1}`,
  };
});

const columns: DataTableColumnDef<LogLine>[] = [
  { accessorKey: "id", header: "#", meta: { align: "end" } },
  { accessorKey: "time", header: "Time" },
  { accessorKey: "level", header: "Level" },
  { accessorKey: "service", header: "Service" },
  { accessorKey: "message", header: "Message", enableSorting: false },
];

export default function VirtualRows() {
  return (
    <VirtualDataTable
      data={lines}
      columns={columns}
      getRowId={(line) => String(line.id)}
      // Only the rows in view are rendered, inside a scroll area this tall.
      // Rows are not measured: estimateSize is their height, so keep them on one line.
      virtual={{ estimateSize: 40, maxHeight: 360 }}
      slotProps={{ cell: () => ({ style: { whiteSpace: "nowrap" } }) }}
    />
  );
}

