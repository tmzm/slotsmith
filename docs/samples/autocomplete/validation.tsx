import { useId, useState, type FormEvent } from "react";
import { Autocomplete, type OptionValue } from "slotsmith/autocomplete";
import { countries, type Country } from "../shared/options";

export default function Validation() {
  const [country, setCountry] = useState<OptionValue | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const labelId = useId();
  const errorId = useId();

  // Check once the form has been submitted, then again on every change.
  const invalid = submitted && country === null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setSent(country !== null);
    // `id` lands on the combobox, so focus can go straight back to the field that failed.
    if (country === null) document.getElementById(fieldId)?.focus();
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <div style={{ display: "grid", gap: "0.375rem" }}>
        {/* The label and the message are the app's markup: the component only marks itself invalid. */}
        <span id={labelId} style={{ fontWeight: 500, color: invalid ? "var(--ss-danger, #dc2626)" : undefined }}>
          Shipping country
        </span>
        <Autocomplete<Country>
          id={fieldId}
          options={countries}
          getOptionValue={(entry) => entry.code}
          getOptionLabel={(entry) => entry.name}
          value={country}
          onChange={(next: OptionValue | null) => {
            setCountry(next);
            setSent(false);
          }}
          // aria-invalid on the combobox, data-invalid on the root and trigger.
          invalid={invalid}
          aria-labelledby={labelId}
          aria-required="true"
          aria-describedby={invalid ? errorId : undefined}
        />
        {invalid && (
          <p id={errorId} style={{ margin: 0, color: "var(--ss-danger, #dc2626)" }}>
            Pick a country to continue.
          </p>
        )}
      </div>
      <div>
        <button type="submit" style={{ background: "transparent" }}>
          Continue
        </button>
      </div>
      <p role="status" style={{ margin: 0 }}>
        {sent ? `Sent: ${country}` : ""}
      </p>
    </form>
  );
}
