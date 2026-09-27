import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Arabic
 *
 * Labels for every component. Each count supplies the Arabic forms its
 * phrase needs: `one` and `two` as words, `few` (3 to 10) with a plural noun,
 * `many` (11 to 99) with the accusative singular ("11 ملفًا"), and `other`
 * (100 and up) with the genitive singular ("100 ملف"); `zero` only where the
 * phrase reads differently for none. Numbers are written the way the active tag writes them, so `ar-EG` gets
 * Arabic-Indic digits from the same text.
 *
 * @example
 * ```tsx
 * import { ar } from "slotsmith/locales/ar";
 *
 * <DataTable locale={ar} data={rows} columns={columns} />;
 * ```
 */
export const ar = defineLocale({
  code: "ar",
  dir: "rtl",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "لا توجد بيانات",
      error: "حدث خطأ أثناء تحميل البيانات.",
      retry: "إعادة المحاولة",
      rowsPerPage: "عدد الصفوف",
      pageInfo: (page, pageCount) => `صفحة ${number(page)} من ${number(pageCount)}`,
      pagination: "التنقل بين الصفحات",
      previousPage: "الصفحة السابقة",
      nextPage: "الصفحة التالية",
      selectAll: "تحديد كل صفوف الصفحة",
      selectRow: "تحديد الصف",
      expandRow: "توسيع الصف",
      collapseRow: "طي الصف",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "اختر…",
      search: "ابحث…",
      clear: "مسح التحديد",
      remove: (label) => `حذف ${label}`,
      empty: "لا نتائج",
      loading: "جارٍ التحميل…",
      minChars: (count) =>
        plural(count, {
          one: "اكتب حرفًا واحدًا أو أكثر للبحث",
          two: "اكتب حرفين أو أكثر للبحث",
          few: "اكتب {count} أحرف أو أكثر للبحث",
          many: "اكتب {count} حرفًا أو أكثر للبحث",
          other: "اكتب {count} حرف أو أكثر للبحث",
        }),
      retry: "إعادة المحاولة",
      create: (query) => `إنشاء “${query}”`,
      creating: "جارٍ الإنشاء…",
      more: (count) => `+${number(count)}`,
      loadMore: "تحميل المزيد",
      results: (count) =>
        plural(count, {
          zero: "لا نتائج",
          one: "نتيجة واحدة",
          two: "نتيجتان",
          few: "{count} نتائج",
          other: "{count} نتيجة",
        }),
    };
  },

  datePicker: (code) => {
    const number = createNumber(code);
    return {
      placeholder: "اختر تاريخًا",
      clear: "مسح التاريخ",
      previous: "الشهر السابق",
      next: "الشهر التالي",
      today: "اليوم",
      month: "الشهر",
      year: "السنة",
      dialog: "اختيار التاريخ",
      count: (count) => `عدد التواريخ المختارة: ${number(count)}`,
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "اسحب وأفلِت، أو تصفّح",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, "، ") : null,
          maxSize ? `حتى ${maxSize}` : null,
          maxFiles && maxFiles > 1
            ? plural(maxFiles, {
                two: "ملفان كحد أقصى",
                few: "بحد أقصى {count} ملفات",
                many: "بحد أقصى {count} ملفًا",
                other: "بحد أقصى {count} ملف",
              })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "أفلِت للإضافة",
      browse: "تصفّح",
      dropzone: "إضافة ملفات",
      remove: "حذف الملف",
      retry: "إعادة محاولة الرفع",
      cancel: "إلغاء الرفع",
      progress: (name) => `جارٍ رفع ${name}`,
      ready: "جاهز",
      uploading: "جارٍ الرفع…",
      done: "تم الرفع",
      failed: "فشل",
      preview: (name) => `معاينة ${name}`,
      dismiss: "إخفاء",
      rejectedTitle: (count) =>
        plural(count, {
          one: "تعذّر إضافة ملف واحد",
          two: "تعذّر إضافة ملفين",
          few: "تعذّر إضافة {count} ملفات",
          many: "تعذّر إضافة {count} ملفًا",
          other: "تعذّر إضافة {count} ملف",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `نوع الملف ${name} غير مسموح به`,
      tooLarge: (name, max) => `حجم ${name} يتجاوز ${max}`,
      tooSmall: (name, min) => `حجم ${name} أقل من ${min}`,
      tooMany: (max) =>
        plural(max, {
          one: "لا يمكن إضافة أكثر من ملف واحد",
          two: "لا يمكن إضافة أكثر من ملفين",
          few: "لا يمكن إضافة أكثر من {count} ملفات",
          many: "لا يمكن إضافة أكثر من {count} ملفًا",
          other: "لا يمكن إضافة أكثر من {count} ملف",
        }),
    };
  },
});
