import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Turkish
 *
 * Labels for every component. A noun after a number stays singular
 * ("3 dosya"), so every count has one form. Names are set apart with a colon
 * so no Turkish suffix has to attach to text of unknown spelling.
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { tr } from "slotsmith/locales/tr";
 *
 * <DataTable locale={tr} data={rows} columns={columns} />;
 * ```
 */
export const tr = defineLocale({
  code: "tr",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Veri bulunamadı",
      error: "Veriler yüklenirken bir hata oluştu.",
      retry: "Yeniden dene",
      rowsPerPage: "Sayfa başına satır",
      pageInfo: (page, pageCount) => `Sayfa ${number(page)} / ${number(pageCount)}`,
      pagination: "Sayfalama",
      previousPage: "Önceki sayfa",
      nextPage: "Sonraki sayfa",
      selectAll: "Bu sayfadaki tüm satırları seç",
      selectRow: "Satırı seç",
      expandRow: "Satırı genişlet",
      collapseRow: "Satırı daralt",
      reorderRow: "Satırın sırasını değiştir",
      reorderInstructions:
        "Satırı kaldırmak için boşluk tuşuna, taşımak için ok tuşlarına, bırakmak için boşluk tuşuna, iptal etmek için Escape tuşuna basın.",
      reorderLifted: (position, total) => `Satır kaldırıldı. Konum ${number(position)} / ${number(total)}.`,
      reorderMoved: (position, total) => `Konum ${number(position)} / ${number(total)}.`,
      reorderDropped: (position, total) => `Satır bırakıldı. Konum ${number(position)} / ${number(total)}.`,
      reorderCancelled: "Sıralama iptal edildi.",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Seçin…",
      search: "Ara…",
      clear: "Seçimi temizle",
      remove: (label) => `Kaldır: ${label}`,
      empty: "Sonuç yok",
      loading: "Yükleniyor…",
      minChars: (count) => plural(count, { other: "Aramak için en az {count} karakter yazın" }),
      retry: "Yeniden dene",
      create: (query) => `Oluştur: “${query}”`,
      creating: "Oluşturuluyor…",
      more: (count) => `+${number(count)}`,
      loadMore: "Daha fazla yükle",
      results: (count) => plural(count, { other: "{count} sonuç" }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Tarih seçin",
      clear: "Tarihi temizle",
      previous: "Önceki ay",
      next: "Sonraki ay",
      today: "Bugüne git",
      month: "Ay",
      year: "Yıl",
      dialog: "Tarih seçici",
      count: (count) => plural(count, { other: "{count} tarih seçildi" }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Sürükleyip bırakın veya göz atın",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `en fazla ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "en fazla {count} dosya" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Eklemek için bırakın",
      browse: "Göz at",
      dropzone: "Dosya ekle",
      remove: "Dosyayı kaldır",
      retry: "Yüklemeyi yeniden dene",
      cancel: "Yüklemeyi iptal et",
      progress: (name) => `Yükleniyor: ${name}`,
      ready: "Hazır",
      uploading: "Karşıya yükleniyor…",
      done: "Yüklendi",
      failed: "Başarısız",
      preview: (name) => `Önizleme: ${name}`,
      dismiss: "Kapat",
      rejectedTitle: (count) => plural(count, { other: "{count} dosya eklenemedi" }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `${name}: dosya türüne izin verilmiyor`,
      tooLarge: (name, max) => `${name}: dosya çok büyük (en fazla ${max})`,
      tooSmall: (name, min) => `${name}: dosya çok küçük (en az ${min})`,
      tooMany: (max) => plural(max, { other: "En fazla {count} dosyaya izin verilir" }),
    };
  },
});
