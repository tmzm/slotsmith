import { useRef, useState, type CSSProperties } from "react";
import { Autocomplete, useAsyncOptions, type AutocompleteOptionLabelSlotProps, type OptionValue } from "slotsmith/autocomplete";
import { formatDownloads, searchPackages, type Pkg } from "../shared/fake-catalog";

type Request = { id: number; url: string; status: "pending" | "done" | "cancelled" };

/** A richer option row: the record goes to the OptionLabel slot. */
function PackageRow({ option, label }: AutocompleteOptionLabelSlotProps<Pkg>) {
  return (
    <span style={{ display: "flex", justifyContent: "space-between", gap: "1rem", inlineSize: "100%" }}>
      <span dir="ltr">{label}</span>
      <span dir="ltr" style={{ opacity: 0.7 }}>
        {formatDownloads(option.downloads)}
      </span>
    </span>
  );
}

// One line per request, cut short with an ellipsis on a narrow screen.
const clip: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis" };

export default function RemoteOptions() {
  const [open, setOpen] = useState(false);
  const [slow, setSlow] = useState(false);
  const [packageId, setPackageId] = useState<OptionValue | null>(null);
  const [log, setLog] = useState<Request[]>([]);
  const nextId = useRef(0);

  // Only a request still pending can end as cancelled: the next search aborts the last signal even when its answer has arrived.
  const track = (id: number, status: Request["status"]) =>
    setLog((all) => all.map((entry) => (entry.id === id && entry.status === "pending" ? { ...entry, status } : entry)));

  // `reload` is not an Autocomplete prop: take it out, then spread the rest.
  const { reload, ...packages } = useAsyncOptions<Pkg>({
    // Nothing is fetched until the picker opens.
    enabled: open,
    debounce: 300,
    load: async (query, page, signal) => {
      const id = ++nextId.current;
      setLog((all) => [{ id, url: `GET /packages?q=${encodeURIComponent(query)}&page=${page}`, status: "pending" as const }, ...all].slice(0, 5));
      // A newer search aborts this one; pass the signal to fetch() in a real app.
      signal.addEventListener("abort", () => track(id, "cancelled"));
      const result = await searchPackages(query, page, signal, { latency: slow ? 2000 : 250 });
      track(id, "done");
      return result;
    },
  });

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 420 }}>
      <label>
        <input type="checkbox" checked={slow} onChange={(event) => setSlow(event.target.checked)} /> Slow network (2 s a request)
      </label>
      {/* The log sits above the picker, where the open list cannot cover it, with room kept for all five lines so the picker never moves. */}
      <div>
        <button type="button" onClick={reload} style={{ background: "transparent" }}>
          Reload
        </button>
        <ul
          dir="ltr"
          style={{ margin: "0.5rem 0 0", paddingInlineStart: "1.25rem", fontFamily: "monospace", fontSize: "0.8125rem", lineHeight: 1.5, minBlockSize: "7.5em", whiteSpace: "nowrap" }}
        >
          {log.length === 0 ? <li>No requests yet. Open the picker.</li> : log.map((entry) => <li key={entry.id} style={clip}>{`${entry.url} · ${entry.status}`}</li>)}
        </ul>
      </div>
      <Autocomplete<Pkg>
        {...packages}
        getOptionLabel={(pkg) => pkg.name}
        open={open}
        onOpenChange={setOpen}
        value={packageId}
        onChange={setPackageId}
        components={{ OptionLabel: PackageRow }}
        aria-label="Package"
      />
    </div>
  );
}
