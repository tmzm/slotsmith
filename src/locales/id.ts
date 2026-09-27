import { defineLocale } from "../locale/defineLocale";
import { createNumber, createPlural } from "../locale/plural";

/**
 * Indonesian
 *
 * Labels for every component. Indonesian has one plural form, and a noun
 * after a number stays unmarked ("3 file").
 *
 * Drafted from the English labels; corrections from native speakers are welcome.
 *
 * @example
 * ```tsx
 * import { id } from "slotsmith/locales/id";
 *
 * <DataTable locale={id} data={rows} columns={columns} />;
 * ```
 */
export const id = defineLocale({
  code: "id",
  dir: "ltr",

  table: (code) => {
    const number = createNumber(code);
    return {
      empty: "Tidak ada data",
      error: "Terjadi kesalahan saat memuat data.",
      retry: "Coba lagi",
      rowsPerPage: "Baris per halaman",
      pageInfo: (page, pageCount) => `Halaman ${number(page)} dari ${number(pageCount)}`,
      pagination: "Navigasi halaman",
      previousPage: "Halaman sebelumnya",
      nextPage: "Halaman berikutnya",
      selectAll: "Pilih semua baris di halaman ini",
      selectRow: "Pilih baris",
      expandRow: "Bentangkan baris",
      collapseRow: "Ciutkan baris",
    };
  },

  autocomplete: (code) => {
    const plural = createPlural(code);
    const number = createNumber(code);
    return {
      placeholder: "Pilih…",
      search: "Cari…",
      clear: "Hapus pilihan",
      remove: (label) => `Hapus ${label}`,
      empty: "Tidak ada hasil",
      loading: "Memuat…",
      minChars: (count) => plural(count, { other: "Ketik minimal {count} karakter untuk mencari" }),
      retry: "Coba lagi",
      create: (query) => `Buat “${query}”`,
      creating: "Membuat…",
      more: (count) => `+${number(count)}`,
      loadMore: "Muat lebih banyak",
      results: (count) => plural(count, { other: "{count} hasil" }),
    };
  },

  datePicker: (code) => {
    const plural = createPlural(code);
    return {
      placeholder: "Pilih tanggal",
      clear: "Hapus tanggal",
      previous: "Bulan sebelumnya",
      next: "Bulan berikutnya",
      today: "Hari ini",
      month: "Bulan",
      year: "Tahun",
      dialog: "Pemilih tanggal",
      count: (count) => plural(count, { other: "{count} tanggal dipilih" }),
      rangeStart: (from) => `${from} — …`,
      range: (from, to) => `${from} — ${to}`,
    };
  },

  fileUploader: (code) => {
    const plural = createPlural(code);
    return {
      title: "Seret dan lepas, atau telusuri",
      // Same parts as the English hint: the accepted types, the size limit,
      // and the file limit only when more than one file is allowed.
      hint: ({ accept, maxSize, maxFiles }) =>
        [
          accept ? accept.replace(/,/g, ", ") : null,
          maxSize ? `hingga ${maxSize}` : null,
          maxFiles && maxFiles > 1 ? plural(maxFiles, { other: "maks. {count} file" }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
      dropHere: "Lepas untuk menambahkan",
      browse: "Telusuri",
      dropzone: "Tambahkan file",
      remove: "Hapus file",
      retry: "Coba unggah lagi",
      cancel: "Batalkan unggahan",
      progress: (name) => `Mengunggah ${name}`,
      ready: "Siap",
      uploading: "Mengunggah…",
      done: "Terunggah",
      failed: "Gagal",
      preview: (name) => `Pratinjau ${name}`,
      dismiss: "Tutup",
      rejectedTitle: (count) => plural(count, { other: "{count} file tidak ditambahkan" }),
    };
  },

  fileValidation: (code) => {
    const plural = createPlural(code);
    return {
      wrongType: (name) => `Jenis file ${name} tidak diizinkan`,
      tooLarge: (name, max) => `${name} terlalu besar (maks. ${max})`,
      tooSmall: (name, min) => `${name} terlalu kecil (min. ${min})`,
      tooMany: (max) => plural(max, { other: "Hanya {count} file yang diizinkan" }),
    };
  },
});
