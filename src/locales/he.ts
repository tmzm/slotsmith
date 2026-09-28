import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Hebrew
 *
 * Labels for every component. Actions use the infinitive or a noun, so no
 * label assumes the reader's gender ("לבחור שורה"), and counts have the
 * Hebrew dual for two.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { he } from "slotsmith/locales/he";
 *
 * <DataTable locale={he} data={rows} columns={columns} />;
 * ```
 */
export const he = defineLocale({
  code: "he",
  dir: "rtl",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "לא נמצאו נתונים",
      error: "אירעה שגיאה בטעינת הנתונים.",
      retry: "לנסות שוב",
      rowsPerPage: "שורות בעמוד",
      pageInfo: (page, pageCount) => `עמוד ${number(page)} מתוך ${number(pageCount)}`,
      pagination: "ניווט בין עמודים",
      previousPage: "העמוד הקודם",
      nextPage: "העמוד הבא",
      selectAll: "לבחור את כל השורות בעמוד",
      selectRow: "לבחור שורה",
      expandRow: "להרחיב שורה",
      collapseRow: "לכווץ שורה",
      reorderRow: "להזיז שורה",
      reorderInstructions:
        "יש להקיש על מקש הרווח כדי להרים את השורה, על מקשי החיצים כדי להזיז אותה, על מקש הרווח כדי לשחרר אותה ועל Escape כדי לבטל.",
      reorderLifted: (position, total) => `השורה הורמה. מיקום ${number(position)} מתוך ${number(total)}.`,
      reorderMoved: (position, total) => `מיקום ${number(position)} מתוך ${number(total)}.`,
      reorderDropped: (position, total) => `השורה שוחררה במיקום ${number(position)} מתוך ${number(total)}.`,
      reorderCancelled: "שינוי הסדר בוטל.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "בחירה…",
      search: "חיפוש…",
      clear: "ניקוי הבחירה",
      remove: (label) => `הסרת ${label}`,
      empty: "אין תוצאות",
      loading: "בטעינה…",
      minChars: (count) =>
        plural(count, {
          one: "יש להקליד תו אחד לפחות כדי לחפש",
          two: "יש להקליד {count} תווים לפחות כדי לחפש",
          other: "יש להקליד {count} תווים לפחות כדי לחפש",
        }),
      retry: "לנסות שוב",
      create: (query) => `יצירת "${query}"`,
      creating: "ביצירה…",
      more: (count) => `+${number(count)}`,
      loadMore: "לטעון עוד",
      results: (count) =>
        plural(count, {
          one: "תוצאה אחת",
          two: "שתי תוצאות",
          other: "{count} תוצאות",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "בחירת תאריך",
      clear: "ניקוי התאריך",
      previous: "החודש הקודם",
      next: "החודש הבא",
      today: "היום",
      month: "חודש",
      year: "שנה",
      dialog: "בורר תאריכים",
      count: (count) =>
        plural(count, {
          one: "נבחר תאריך אחד",
          two: "נבחרו שני תאריכים",
          other: "נבחרו {count} תאריכים",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "לגרור ולשחרר, או לעיין",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `עד ${maxSize}` : null,
          maxFiles && maxFiles > 1
            ? plural(maxFiles, {
                two: "שני קבצים לכל היותר",
                other: "{count} קבצים לכל היותר",
              })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "לשחרר כדי להוסיף",
      browse: "עיון",
      dropzone: "הוספת קבצים",
      remove: "הסרת הקובץ",
      retry: "לנסות להעלות שוב",
      cancel: "ביטול ההעלאה",
      progress: (name) => `העלאת ${name}`,
      ready: "מוכן",
      uploading: "בהעלאה…",
      done: "הועלה",
      failed: "נכשל",
      preview: (name) => `תצוגה מקדימה של ${name}`,
      dismiss: "סגירה",
      rejectedTitle: (count) =>
        plural(count, {
          one: "קובץ אחד לא נוסף",
          two: "שני קבצים לא נוספו",
          other: "{count} קבצים לא נוספו",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `סוג הקובץ של ${name} אינו מותר`,
      tooLarge: (name, max) => `${name} גדול מדי (עד ${max})`,
      tooSmall: (name, min) => `${name} קטן מדי (לפחות ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "אפשר להוסיף קובץ אחד בלבד",
          two: "אפשר להוסיף שני קבצים בלבד",
          other: "אפשר להוסיף {count} קבצים בלבד",
        }),
    };
  },
});
