import { useId, useState, type FormEvent } from "react";
import { DatePicker, type ISODate } from "slotsmith/date-picker";

export default function Validation() {
  const [start, setStart] = useState<ISODate | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const fieldId = useId();
  const labelId = useId();
  const errorId = useId();

  // Check once the form has been submitted, then again on every change.
  const invalid = submitted && start === null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setSent(start !== null);
    // `id` lands on the combobox, so focus can go straight back to the field that failed.
    if (start === null) document.getElementById(fieldId)?.focus();
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: "1rem", maxWidth: 360 }}>
      <div style={{ display: "grid", gap: "0.375rem" }}>
        {/* The label and the message are the app's markup: the component only marks itself invalid. */}
        <span id={labelId} style={{ fontWeight: 500, color: invalid ? "var(--ss-danger, #dc2626)" : undefined }}>
          Start date
        </span>
        <DatePicker
          id={fieldId}
          value={start}
          onChange={(next) => {
            setStart(next);
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
            The start date is required.
          </p>
        )}
      </div>
      <div>
        <button type="submit" style={{ background: "transparent" }}>
          Continue
        </button>
      </div>
      <p role="status" style={{ margin: 0 }}>
        {sent ? `Sent: ${start}` : ""}
      </p>
    </form>
  );
}
