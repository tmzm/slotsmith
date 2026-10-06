import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";
import type { SlotsmithLocale } from "../locale/types";

/**
 * German
 *
 * Labels for every component. Actions use the infinitive ("Zeile auswählen"),
 * and quoted text uses German quotation marks.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { de } from "slotsmith/locales/de";
 *
 * <DataTable locale={de} data={rows} columns={columns} />;
 * ```
 */
export const de: SlotsmithLocale = defineLocale({
  code: "de",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Keine Daten gefunden",
      error: "Beim Laden der Daten ist ein Fehler aufgetreten.",
      retry: "Erneut versuchen",
      rowsPerPage: "Zeilen pro Seite",
      pageInfo: (page, pageCount) => `Seite ${number(page)} von ${number(pageCount)}`,
      pagination: "Seitennavigation",
      previousPage: "Vorherige Seite",
      nextPage: "Nächste Seite",
      selectAll: "Alle Zeilen dieser Seite auswählen",
      selectRow: "Zeile auswählen",
      expandRow: "Zeile aufklappen",
      collapseRow: "Zeile zuklappen",
      reorderRow: "Zeile verschieben",
      reorderInstructions:
        "Leertaste drücken, um die Zeile anzuheben, Pfeiltasten, um sie zu verschieben, Leertaste, um sie abzulegen, Escape, um abzubrechen.",
      reorderLifted: (position, total) => `Zeile angehoben. Position ${number(position)} von ${number(total)}.`,
      reorderMoved: (position, total) => `Position ${number(position)} von ${number(total)}.`,
      reorderDropped: (position, total) => `Zeile an Position ${number(position)} von ${number(total)} abgelegt.`,
      reorderCancelled: "Verschieben abgebrochen.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Auswählen…",
      search: "Suchen…",
      clear: "Auswahl löschen",
      remove: (label) => `${label} entfernen`,
      empty: "Keine Ergebnisse",
      loading: "Wird geladen…",
      minChars: (count) =>
        plural(count, {
          one: "Mindestens {count} Zeichen eingeben, um zu suchen",
          other: "Mindestens {count} Zeichen eingeben, um zu suchen",
        }),
      retry: "Erneut versuchen",
      create: (query) => `„${query}“ erstellen`,
      creating: "Wird erstellt…",
      more: (count) => `+${number(count)}`,
      loadMore: "Mehr laden",
      results: (count) =>
        plural(count, {
          one: "{count} Ergebnis",
          other: "{count} Ergebnisse",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Datum wählen",
      clear: "Datum löschen",
      previous: "Vorheriger Monat",
      next: "Nächster Monat",
      today: "Zu heute springen",
      month: "Monat",
      year: "Jahr",
      dialog: "Datum auswählen",
      count: (count) =>
        plural(count, {
          one: "{count} Tag ausgewählt",
          other: "{count} Tage ausgewählt",
        }),
      rangeStart: (from) => `${from} – …`,
      range: (from, to) => `${from} – ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Hierher ziehen oder durchsuchen",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `bis ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "max. {count} Dateien" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Zum Hinzufügen ablegen",
      browse: "Durchsuchen",
      dropzone: "Dateien hinzufügen",
      remove: "Datei entfernen",
      retry: "Hochladen wiederholen",
      cancel: "Hochladen abbrechen",
      progress: (name) => `${name} wird hochgeladen`,
      ready: "Bereit",
      uploading: "Wird hochgeladen…",
      done: "Hochgeladen",
      failed: "Fehlgeschlagen",
      preview: (name) => `Vorschau von ${name}`,
      dismiss: "Schließen",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} Datei nicht hinzugefügt",
          other: "{count} Dateien nicht hinzugefügt",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name} hat einen nicht zulässigen Dateityp`,
      tooLarge: (name, max) => `${name} ist zu groß (max. ${max})`,
      tooSmall: (name, min) => `${name} ist zu klein (min. ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "Nur {count} Datei zulässig",
          other: "Nur {count} Dateien zulässig",
        }),
    };
  },
});
