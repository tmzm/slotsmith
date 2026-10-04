import { useId, useState, type ReactNode } from "react";
import { Autocomplete, fold } from "slotsmith/autocomplete";
import { countries, type Country } from "../shared/options";

const byCode = { getOptionValue: (entry: Country) => entry.code, getOptionLabel: (entry: Country) => entry.name };

/** A visible label, and the id that names the picker after it. */
function Field({ label, children }: { label: string; children: (labelId: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <p id={id}>{label}</p>
      {children(id)}
    </div>
  );
}

export default function States() {
  const [failed, setFailed] = useState(true);
  const [results, setResults] = useState<Country[]>([]);

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      <Field label="Loading">
        {/* A first page is in flight and there is nothing to show yet. */}
        {(id) => <Autocomplete options={[]} loading aria-labelledby={id} />}
      </Field>
      <Field label="Empty">
        {(id) => <Autocomplete options={[]} labels={{ empty: "No countries match" }} aria-labelledby={id} />}
      </Field>
      <Field label="Error">
        {/* The error replaces the list; onRetry adds the retry button. */}
        {(id) => (
          <Autocomplete<Country>
            {...byCode}
            options={failed ? [] : countries}
            error={failed ? "503 Service Unavailable" : undefined}
            onRetry={() => setFailed(false)}
            aria-labelledby={id}
          />
        )}
      </Field>
      <Field label="Min. characters">
        {/* Nothing is searched until three characters are typed. */}
        {(id) => (
          <Autocomplete<Country>
            {...byCode}
            options={results}
            filter={false}
            minChars={3}
            onSearchChange={(query) => {
              const text = query.trim();
              setResults(text.length >= 3 ? countries.filter((entry) => fold(entry.name).includes(fold(text))) : []);
            }}
            aria-labelledby={id}
          />
        )}
      </Field>
    </div>
  );
}
