import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Spanish
 *
 * Labels for every component, in neutral Spanish. Actions use the infinitive
 * ("Seleccionar fila"), and quoted text uses angle quotes.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { es } from "slotsmith/locales/es";
 *
 * <DataTable locale={es} data={rows} columns={columns} />;
 * ```
 */
export const es = defineLocale({
  code: "es",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "No se encontraron datos",
      error: "Se produjo un error al cargar los datos.",
      retry: "Reintentar",
      rowsPerPage: "Filas por página",
      pageInfo: (page, pageCount) => `Página ${number(page)} de ${number(pageCount)}`,
      pagination: "Paginación",
      previousPage: "Página anterior",
      nextPage: "Página siguiente",
      selectAll: "Seleccionar todas las filas de esta página",
      selectRow: "Seleccionar fila",
      expandRow: "Expandir fila",
      collapseRow: "Contraer fila",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Seleccionar…",
      search: "Buscar…",
      clear: "Borrar selección",
      remove: (label) => `Quitar ${label}`,
      empty: "Sin resultados",
      loading: "Cargando…",
      minChars: (count) =>
        plural(count, {
          one: "Escribir al menos {count} carácter para buscar",
          other: "Escribir al menos {count} caracteres para buscar",
        }),
      retry: "Reintentar",
      create: (query) => `Crear «${query}»`,
      creating: "Creando…",
      more: (count) => `+${number(count)}`,
      loadMore: "Cargar más",
      results: (count) =>
        plural(count, {
          one: "{count} resultado",
          other: "{count} resultados",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Seleccionar fecha",
      clear: "Borrar fecha",
      previous: "Mes anterior",
      next: "Mes siguiente",
      today: "Hoy",
      month: "Mes",
      year: "Año",
      dialog: "Elegir una fecha",
      count: (count) =>
        plural(count, {
          one: "{count} fecha seleccionada",
          other: "{count} fechas seleccionadas",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Arrastrar y soltar, o examinar",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `hasta ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "máx. {count} archivos" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Soltar para agregar",
      browse: "Examinar",
      dropzone: "Agregar archivos",
      remove: "Quitar archivo",
      retry: "Reintentar la carga",
      cancel: "Cancelar la carga",
      progress: (name) => `Subiendo ${name}`,
      ready: "Listo",
      uploading: "Subiendo…",
      done: "Subido",
      failed: "Error",
      preview: (name) => `Vista previa de ${name}`,
      dismiss: "Cerrar",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} archivo no agregado",
          other: "{count} archivos no agregados",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name} no es un tipo de archivo permitido`,
      tooLarge: (name, max) => `${name} es demasiado grande (máx. ${max})`,
      tooSmall: (name, min) => `${name} es demasiado pequeño (mín. ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "Solo se permite {count} archivo",
          other: "Solo se permiten {count} archivos",
        }),
    };
  },
});
