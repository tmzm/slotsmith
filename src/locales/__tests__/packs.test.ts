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
