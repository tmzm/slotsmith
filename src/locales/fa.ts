import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Persian
 *
 * Labels for every component. Persian is its own language here, not a
 * variant of Arabic: its own words, the half-space (U+200C) where Persian
 * spelling needs it, and Persian digits from the tag.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { fa } from "slotsmith/locales/fa";
 *
 * <DataTable locale={fa} data={rows} columns={columns} />;
 * ```
 */
export const fa = defineLocale({
  code: "fa",
  dir: "rtl",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "داده‌ای یافت نشد",
      error: "هنگام بارگیری داده‌ها خطایی رخ داد.",
      retry: "تلاش دوباره",
      rowsPerPage: "ردیف در هر صفحه",
      pageInfo: (page, pageCount) => `صفحهٔ ${number(page)} از ${number(pageCount)}`,
      pagination: "صفحه‌بندی",
      previousPage: "صفحهٔ قبل",
      nextPage: "صفحهٔ بعد",
      selectAll: "انتخاب همهٔ ردیف‌های این صفحه",
      selectRow: "انتخاب ردیف",
      expandRow: "باز کردن ردیف",
      collapseRow: "بستن ردیف",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "انتخاب کنید…",
      search: "جست‌وجو…",
      clear: "پاک کردن انتخاب",
      remove: (label) => `حذف ${label}`,
      empty: "نتیجه‌ای یافت نشد",
      loading: "در حال بارگیری…",
      minChars: (count) =>
        plural(count, {
          one: "برای جست‌وجو دست‌کم {count} نویسه وارد کنید",
          other: "برای جست‌وجو دست‌کم {count} نویسه وارد کنید",
        }),
      retry: "تلاش دوباره",
      create: (query) => `ایجاد «${query}»`,
      creating: "در حال ایجاد…",
      more: (count) => `+${number(count)}`,
      loadMore: "بارگیری بیشتر",
      results: (count) =>
        plural(count, {
          one: "{count} نتیجه",
          other: "{count} نتیجه",
        }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "انتخاب تاریخ",
      clear: "پاک کردن تاریخ",
      previous: "ماه قبل",
      next: "ماه بعد",
      today: "امروز",
      month: "ماه",
      year: "سال",
      dialog: "انتخاب‌گر تاریخ",
      count: (count) =>
        plural(count, {
          one: "{count} تاریخ انتخاب شد",
          other: "{count} تاریخ انتخاب شد",
        }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "بکشید و رها کنید، یا مرور کنید",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, "، ") : null,
          maxSize ? `تا ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "حداکثر {count} فایل" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "برای افزودن رها کنید",
      browse: "مرور",
      dropzone: "افزودن فایل",
      remove: "حذف فایل",
      retry: "بارگذاری دوباره",
      cancel: "لغو بارگذاری",
      progress: (name) => `در حال بارگذاری ${name}`,
      ready: "آماده",
      uploading: "در حال بارگذاری…",
      done: "بارگذاری شد",
      failed: "ناموفق",
      preview: (name) => `پیش‌نمایش ${name}`,
      dismiss: "بستن",
      rejectedTitle: (count) =>
        plural(count, {
          one: "{count} فایل افزوده نشد",
          other: "{count} فایل افزوده نشد",
        }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `نوع فایل ${name} مجاز نیست`,
      tooLarge: (name, max) => `حجم ${name} بیش از حد مجاز است (حداکثر ${max})`,
      tooSmall: (name, min) => `حجم ${name} کمتر از حد مجاز است (حداقل ${min})`,
      tooMany: (max) =>
        plural(max, {
          one: "حداکثر {count} فایل مجاز است",
          other: "حداکثر {count} فایل مجاز است",
        }),
    };
  },
});
