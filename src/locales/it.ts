import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Italian
 *
 * Labels for every component. Actions use the short imperative Italian
 * interfaces use ("Seleziona riga"), and "file" stays invariable, as it does
 * in Italian.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { it } from "slotsmith/locales/it";
 *
 * <DataTable locale={it} data={rows} columns={columns} />;
 * ```
 */
export const it = defineLocale({
  code: "it",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Nessun dato trovato",
      error: "Si è verificato un errore durante il caricamento dei dati.",
      retry: "Riprova",
      rowsPerPage: "Righe per pagina",
      pageInfo: (page, pageCount) => `Pagina ${number(page)} di ${number(pageCount)}`,
      pagination: "Paginazione",
      previousPage: "Pagina precedente",
      nextPage: "Pagina successiva",
      selectAll: "Seleziona tutte le righe della pagina",
      selectRow: "Seleziona riga",
      expandRow: "Espandi riga",
      collapseRow: "Comprimi riga",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Seleziona…",
      search: "Cerca…",
      clear: "Cancella selezione",
      remove: (label) => `Rimuovi ${label}`,
      empty: "Nessun risultato",
      loading: "Caricamento…",
      minChars: (count) =>
        plural(count, {
          one: "Digita almeno {count} carattere per cercare",
          other: "Digita almeno {count} caratteri per cercare",
        }),
      retry: "Riprova",
      create: (query) => `Crea “${query}”`,
      creating: "Creazione…",
      more: (count) => `+${number(count)}`,
      loadMore: "Carica altri",
      results: (count) =>
        plural(count, {
          one: "{count} risultato",
          other: "{count} risultati",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Seleziona una data",
      clear: "Cancella data",
      previous: "Mese precedente",
      next: "Mese successivo",
      today: "Oggi",
      month: "Mese",
      year: "Anno",
      dialog: "Scegli una data",
      count: (count) =>
        plural(count, {
          one: "{count} data selezionata",
          other: "{count} date selezionate",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Trascina e rilascia, oppure sfoglia",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `fino a ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "max {count} file" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Rilascia per aggiungere",
      browse: "Sfoglia",
      dropzone: "Aggiungi file",
      remove: "Rimuovi file",
      retry: "Riprova il caricamento",
      cancel: "Annulla il caricamento",
      progress: (name) => `Caricamento di ${name}`,
      ready: "Pronto",
      uploading: "Caricamento in corso…",
      done: "Caricato",
      failed: "Non riuscito",
      preview: (name) => `Anteprima di ${name}`,
      dismiss: "Chiudi",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} file non aggiunto",
          other: "{count} file non aggiunti",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `Il tipo di file di ${name} non è consentito`,
      tooLarge: (name, max) => `${name} è troppo grande (max ${max})`,
      tooSmall: (name, min) => `${name} è troppo piccolo (min ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "È consentito solo {count} file",
          other: "Sono consentiti solo {count} file",
        }),
    };
  },
});
