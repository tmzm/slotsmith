import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";
import type { SlotsmithLocale } from "../locale/types";

/**
 * French
 *
 * Labels for every component. Actions use the infinitive, a narrow no-break
 * space sits before a colon and inside the guillemets, and `one` covers both
 * zero and one, as French counts do.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { fr } from "slotsmith/locales/fr";
 *
 * <DataTable locale={fr} data={rows} columns={columns} />;
 * ```
 */
export const fr: SlotsmithLocale = defineLocale({
  code: "fr",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Aucune donnée",
      error: "Une erreur s’est produite lors du chargement des données.",
      retry: "Réessayer",
      rowsPerPage: "Lignes par page",
      pageInfo: (page, pageCount) => `Page ${number(page)} sur ${number(pageCount)}`,
      pagination: "Pagination",
      previousPage: "Page précédente",
      nextPage: "Page suivante",
      selectAll: "Sélectionner toutes les lignes de la page",
      selectRow: "Sélectionner la ligne",
      expandRow: "Développer la ligne",
      collapseRow: "Réduire la ligne",
      reorderRow: "Réordonner la ligne",
      reorderInstructions:
        "Appuyer sur Espace pour soulever la ligne, sur les flèches pour la déplacer, sur Espace pour la déposer et sur Échap pour annuler.",
      reorderLifted: (position, total) => `Ligne soulevée. Position ${number(position)} sur ${number(total)}.`,
      reorderMoved: (position, total) => `Position ${number(position)} sur ${number(total)}.`,
      reorderDropped: (position, total) => `Ligne déposée à la position ${number(position)} sur ${number(total)}.`,
      reorderCancelled: "Réorganisation annulée.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Sélectionner…",
      search: "Rechercher…",
      clear: "Effacer la sélection",
      remove: (label) => `Retirer ${label}`,
      empty: "Aucun résultat",
      loading: "Chargement…",
      minChars: (count) =>
        plural(count, {
          one: "Saisir au moins {count} caractère pour rechercher",
          other: "Saisir au moins {count} caractères pour rechercher",
        }),
      retry: "Réessayer",
      create: (query) => `Créer « ${query} »`,
      creating: "Création…",
      more: (count) => `+${number(count)}`,
      loadMore: "Charger plus",
      results: (count) =>
        plural(count, {
          one: "{count} résultat",
          other: "{count} résultats",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Choisir une date",
      clear: "Effacer la date",
      previous: "Mois précédent",
      next: "Mois suivant",
      today: "Aller à aujourd’hui",
      month: "Mois",
      year: "Année",
      dialog: "Sélection de la date",
      count: (count) =>
        plural(count, {
          one: "{count} date sélectionnée",
          other: "{count} dates sélectionnées",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Glisser-déposer, ou parcourir",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `jusqu’à ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "{count} fichiers max." }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Déposer pour ajouter",
      browse: "Parcourir",
      dropzone: "Ajouter des fichiers",
      remove: "Retirer le fichier",
      retry: "Relancer l’envoi",
      cancel: "Annuler l’envoi",
      progress: (name) => `Envoi de ${name}`,
      ready: "Prêt",
      uploading: "Envoi en cours…",
      done: "Envoyé",
      failed: "Échec",
      preview: (name) => `Aperçu de ${name}`,
      dismiss: "Fermer",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} fichier non ajouté",
          other: "{count} fichiers non ajoutés",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name} : type de fichier non autorisé`,
      tooLarge: (name, max) => `${name} est trop volumineux (max. ${max})`,
      tooSmall: (name, min) => `${name} est trop petit (min. ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "{count} fichier autorisé au maximum",
          other: "{count} fichiers autorisés au maximum",
        }),
    };
  },
});
