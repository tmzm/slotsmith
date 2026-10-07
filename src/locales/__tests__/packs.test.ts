import { describe, expect, it } from "vitest";
import { defaultAutocompleteLabels } from "../../autocomplete/slots/fallbacks";
import { defaultLabels } from "../../data-table/slots/fallbacks";
import { defaultDatePickerLabels } from "../../date-picker/slots/fallbacks";
import { defaultValidationLabels } from "../../file-uploader/core/validate";
import { defaultFileUploaderLabels } from "../../file-uploader/slots/fallbacks";
import type { LocaleSectionName, SlotsmithLocale } from "../../locale";

declare global {
  /**
   * Import meta glob
   *
   * Vite's module glob, typed here because the project does not load Vite's
   * client types and this is the only file that uses it.
   */
  interface ImportMeta {
    glob<T>(pattern: string, options: { eager: true }): Record<string, T>;
  }
}

const ENGLISH: Record<LocaleSectionName, object> = {
  table: defaultLabels,
  autocomplete: defaultAutocompleteLabels,
  datePicker: defaultDatePickerLabels,
  fileUploader: defaultFileUploaderLabels,
  fileValidation: defaultValidationLabels,
};

/** Every file in `src/locales`, so a new pack is covered the moment it is added. */
const FILES = import.meta.glob<Record<string, SlotsmithLocale>>("../*.ts", { eager: true });
const PACKS: SlotsmithLocale[] = Object.values(FILES).flatMap((module) => Object.values(module));
const COUNTS = [0, 1, 2, 3, 5, 11, 21, 100, 1000];

/** Labels whose translation is spelled like the English word. Keep this list short and justified. */
const SAME_AS_ENGLISH: Record<string, string[]> = {
  fr: ["table.pagination"],
};

/**
 * The old `datePicker.today`, by pack code, from before it became a
 * navigation verb (`slotsmith@1.6.0`, commit `01fef7f`, where it was still
 * the bare word for "today"). `ar-EG`, `ar-IQ` and `ar-SA` spread `ar`, so
 * they carried the same bare word.
 */
const OLD_BARE_TODAY: Record<string, string> = {
  ar: "اليوم",
  "ar-EG": "اليوم",
  "ar-IQ": "اليوم",
  "ar-SA": "اليوم",
  de: "Heute",
  es: "Hoy",
  fa: "امروز",
  fr: "Aujourd’hui",
  he: "היום",
  hi: "आज",
  id: "Hari ini",
  it: "Oggi",
  ja: "今日",
  ko: "오늘",
  "pt-BR": "Hoje",
  ru: "Сегодня",
  tr: "Bugün",
  "zh-CN": "今天",
};

it("finds the packs", () => {
  expect(PACKS.map((pack) => pack.code).sort()).toEqual(
    ["ar", "ar-EG", "ar-IQ", "ar-SA", "de", "es", "fa", "fr", "he", "hi", "id", "it", "ja", "ko", "pt-BR", "ru", "tr", "zh-CN"].sort(),
  );
});

it("names each file after its pack's code, and exports one pack from it", () => {
  for (const [path, module] of Object.entries(FILES)) {
    const packs = Object.values(module);
    expect(packs, path).toHaveLength(1);
    expect(path).toBe(`../${packs[0]!.code}.ts`);
  }
});

const build = (pack: SlotsmithLocale, name: LocaleSectionName) => {
  const section = pack[name];
  return (typeof section === "function" ? section(pack.code) : section) as unknown as Record<string, unknown>;
};

describe.each(PACKS.map((pack) => [pack.code, pack] as const))("%s pack", (_code, pack) => {
  it.each(Object.keys(ENGLISH) as LocaleSectionName[])("has every key of %s and nothing else", (name) => {
    expect(Object.keys(build(pack, name)).sort()).toEqual(Object.keys(ENGLISH[name]).sort());
  });

  it.each(Object.keys(ENGLISH) as LocaleSectionName[])("keeps the kind of every value in %s", (name) => {
    const english = ENGLISH[name] as Record<string, unknown>;
    const labels = build(pack, name);
    for (const key of Object.keys(english)) expect(typeof labels[key], key).toBe(typeof english[key]);
  });

  it("returns a non-empty string from every function, for every count", () => {
    for (const name of Object.keys(ENGLISH) as LocaleSectionName[]) {
      const labels = build(pack, name);
      for (const [key, value] of Object.entries(labels)) {
        if (typeof value !== "function") continue;
        for (const count of COUNTS) {
          // Count labels take a number, the others take text; both must survive either.
          const args = key === "hint" ? [{ accept: "image/*", maxSize: "5 MB", maxFiles: count }] : [count, count];
          const out = (value as (...a: unknown[]) => unknown)(...args);
          expect(String(out).length, `${name}.${key}(${count})`).toBeGreaterThan(0);
          expect(String(out), `${name}.${key}(${count})`).not.toContain("{");
        }
      }
    }
  });

  it("has no string left in English", () => {
    for (const name of Object.keys(ENGLISH) as LocaleSectionName[]) {
      const english = ENGLISH[name] as Record<string, unknown>;
      const labels = build(pack, name);
      for (const [key, value] of Object.entries(labels)) {
        if (SAME_AS_ENGLISH[pack.code]?.includes(`${name}.${key}`)) continue;
        // Symbols-only labels (the range separator) read the same in every language.
        if (typeof value === "string" && /[a-z]{3}/i.test(String(english[key]))) {
          expect(value, `${name}.${key}`).not.toBe(english[key]);
        }
      }
    }
  });

  it("moved datePicker.today away from the old bare word for \"today\"", () => {
    const oldWord = OLD_BARE_TODAY[pack.code];
    if (oldWord === undefined) return;
    expect(build(pack, "datePicker").today, `${pack.code} datePicker.today`).not.toBe(oldWord);
  });
});

describe("ar pack plural forms", () => {
  const ar = PACKS.find((pack) => pack.code === "ar")!;
  const call = (name: LocaleSectionName, key: string, ...args: unknown[]) =>
    String((build(ar, name)[key] as (...a: unknown[]) => unknown)(...args));

  // 11 to 99 take the accusative singular, 100 and up the genitive singular.
  it.each([
    ["fileUploader", "rejectedTitle", "ملف"],
    ["fileValidation", "tooMany", "ملف"],
    ["autocomplete", "minChars", "حرف"],
  ] as const)("%s.%s uses the accusative for 11 and the genitive for 100", (name, key, noun) => {
    expect(call(name, key, 11)).toContain(`${noun}ًا`);
    expect(call(name, key, 100)).toContain(noun);
    expect(call(name, key, 100)).not.toContain(`${noun}ًا`);
  });

  it("does the same in the uploader hint", () => {
    const hint = (maxFiles: number) => call("fileUploader", "hint", { maxFiles });
    expect(hint(11)).toContain("ملفًا");
    expect(hint(100)).toContain("ملف");
    expect(hint(100)).not.toContain("ملفًا");
  });
});

/**
 * Right-to-left hints
 *
 * The accepted types are Latin, so in a right-to-left sentence the bidi
 * algorithm would reorder them (`image/*` reads `*\/image`). Each type is
 * wrapped in a left-to-right isolate, and the list joined with the language's
 * own separator, so every type keeps its order and the list still reads right
 * to left.
 */
describe.each([
  ["ar", "، "],
  ["ar-EG", "، "],
  ["ar-IQ", "، "],
  ["ar-SA", "، "],
  ["fa", "، "],
  ["he", ", "],
])("%s uploader hint", (code, separator) => {
  const pack = PACKS.find((candidate) => candidate.code === code)!;
  const hint = (limits: { accept?: string; maxSize?: string; maxFiles?: number }) =>
    String((build(pack, "fileUploader").hint as (limits: object) => unknown)(limits));

  it("isolates each accepted type, in the given order", () => {
    expect(hint({ accept: "image/*,.pdf" })).toBe(`⁦image/*⁩${separator}⁦.pdf⁩`);
  });

  it("ignores the spaces and empty entries an accept list may carry", () => {
    expect(hint({ accept: " image/png , ,.pdf " })).toBe(`⁦image/png⁩${separator}⁦.pdf⁩`);
  });

  it("keeps the other parts as they were", () => {
    const full = hint({ accept: "image/*", maxSize: "5 MB", maxFiles: 3 });
    expect(full.startsWith("⁦image/*⁩ · ")).toBe(true);
    expect(full.split(" · ")).toHaveLength(3);
  });
});

it("leaves the left-to-right packs' hints without isolates", () => {
  for (const pack of PACKS.filter((candidate) => candidate.dir !== "rtl")) {
    const hint = String((build(pack, "fileUploader").hint as (limits: object) => unknown)({ accept: "image/*,.pdf" }));
    expect(hint, pack.code).not.toMatch(/[⁦-⁩]/);
  }
});

/**
 * Right-to-left file names
 *
 * A file name is usually Latin, so in a right-to-left message the bidi
 * algorithm would pull its punctuation apart from it (`report.v2.pdf` read
 * from the wrong end, or its extension stuck to the Arabic word beside it).
 * Each message that names a file wraps the name in a first-strong isolate,
 * whole, even when it holds a comma, so a Latin name keeps its order and an
 * Arabic, Persian or Hebrew name still reads right to left.
 */
describe.each(["ar", "ar-EG", "ar-IQ", "ar-SA", "fa", "he"])("%s file names", (code) => {
  const pack = PACKS.find((candidate) => candidate.code === code)!;
  const name = "scan, final.v2.pdf";
  const isolated = `⁨${name}⁩`;
  const messages = (): [string, string][] => {
    const validation = build(pack, "fileValidation") as Record<string, (...args: unknown[]) => unknown>;
    const uploader = build(pack, "fileUploader") as Record<string, (...args: unknown[]) => unknown>;
    return [
      ["wrongType", String(validation.wrongType!(name))],
      ["tooLarge", String(validation.tooLarge!(name, "5 MB"))],
      ["tooSmall", String(validation.tooSmall!(name, "1 KB"))],
      ["progress", String(uploader.progress!(name))],
      ["preview", String(uploader.preview!(name))],
    ];
  };

  it("isolates the file name, whole, once, in every message that names a file", () => {
    for (const [key, message] of messages()) {
      expect(message.split(isolated), key).toHaveLength(2);
      expect(message.replace(isolated, ""), key).not.toContain(name);
    }
  });
});

it("leaves the left-to-right packs' file names without isolates", () => {
  for (const pack of PACKS.filter((candidate) => candidate.dir !== "rtl")) {
    const validation = build(pack, "fileValidation") as Record<string, (...args: unknown[]) => unknown>;
    const uploader = build(pack, "fileUploader") as Record<string, (...args: unknown[]) => unknown>;
    for (const message of [validation.wrongType!("a.pdf"), validation.tooLarge!("a.pdf", "5 MB"), uploader.progress!("a.pdf"), uploader.preview!("a.pdf")]) {
      expect(String(message), pack.code).not.toMatch(/[⁦-⁩]/);
    }
  }
});
