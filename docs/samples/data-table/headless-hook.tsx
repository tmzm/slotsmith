import { flexRender } from "@tanstack/react-table";
import { useState, type CSSProperties } from "react";
import { useDataTable, type DataTableColumnDef, type DataTableLabels } from "slotsmith/data-table";

type Track = { id: string; title: string; artist: string; length: string };

const playlist: Track[] = [
  { id: "1", title: "Morning Light", artist: "The Harbour", length: "3:41" },
  { id: "2", title: "Paper Boats", artist: "Mina Sol", length: "4:05" },
  { id: "3", title: "Slow Tide", artist: "The Harbour", length: "5:12" },
  { id: "4", title: "North Road", artist: "Kai Brenner", length: "3:28" },
  { id: "5", title: "Last Train", artist: "Mina Sol", length: "4:47" },
];

const columns: DataTableColumnDef<Track>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "artist", header: "Artist" },
  { accessorKey: "length", header: "Length" },
];

// The hook reads the reorder labels; any left out stay English.
const labels: Partial<DataTableLabels> = {
  reorderRow: "Move track",
  reorderInstructions: "Press space to pick the track up, the arrow keys to move it, space to put it down, escape to cancel.",
  reorderCancelled: "Move cancelled.",
};

const cellStyle: CSSProperties = { padding: "0.375rem 0.5rem", borderBlockEnd: "1px solid", textAlign: "start" };
// No `outline` here: the handle keeps the browser's focus ring, so keyboard users can see which handle has focus.
const handleStyle: CSSProperties = { font: "inherit", color: "inherit", background: "none", border: 0, padding: "0 0.25rem" };
const hidden: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };

export default function HeadlessHook() {
  const [tracks, setTracks] = useState(playlist);
  const { table, reorder } = useDataTable({
    data: tracks,
    columns,
    getRowId: (track) => track.id,
    enablePagination: false,
    enableRowReorder: true,
    onRowOrderChange: (change) => setTracks(change.data),
    labels,
  });

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              <th style={cellStyle}>
                <span style={hidden}>Order</span>
              </th>
              {group.headers.map((header) => (
                <th key={header.id} style={cellStyle}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            // data-row-id always; data-dragging and data-drop-edge during a drag.
            const attributes = reorder.getRowProps(row.id);
            const handle = reorder.getHandleProps(row.id);
            const lifted = attributes["data-dragging"] !== undefined;
            const edge = attributes["data-drop-edge"];
            return (
              <tr
                key={row.id}
                {...attributes}
                style={{
                  position: lifted ? "relative" : undefined,
                  background: lifted ? "Canvas" : undefined,
                  boxShadow: edge === "before" ? "inset 0 2px 0 0 currentColor" : edge === "after" ? "inset 0 -2px 0 0 currentColor" : undefined,
                }}
              >
                <td style={cellStyle}>
                  <button type="button" {...handle} style={{ ...handle.style, ...handleStyle, cursor: lifted ? "grabbing" : "grab" }}>
                    ⠿
                  </button>
                </td>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} style={cellStyle}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Every handle's aria-describedby points here. */}
      <div id={reorder.instructionsId} hidden>
        {labels.reorderInstructions}
      </div>
      {/* Always rendered: a live region added at the moment it changes is not read. */}
      <div role="status" aria-live="assertive" aria-atomic="true" style={hidden}>
        {reorder.announcement}
      </div>
    </>
  );
}
