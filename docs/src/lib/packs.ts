/**
 * Locale packs
 *
 * The packs the library ships, read from `src/locales/` at build, so the
 * languages page lists exactly what ships: a pack added to the library shows
 * up without an edit here. English has no pack; it is every component's
 * default.
 */
import type { SlotsmithLocale } from "slotsmith/locale";

/** One shipped pack, as the languages page lists it. */
export interface PackInfo {
  /** The pack's BCP 47 tag, which is also its file name (`ar-EG`). */
  code: string;
  /** The language's English name, from `Intl.DisplayNames` (`Arabic (Egypt)`). */
  name: string;
  /** The direction the pack declares. */
  dir: "ltr" | "rtl";
  /** The entry an app imports it from (`slotsmith/locales/ar-EG`). */
  importPath: string;
  /** The pack's named export (`arEG`). */
  exportName: string;
}

const modules = import.meta.glob<Record<string, SlotsmithLocale>>("../../../src/locales/*.ts", { eager: true });

const english = new Intl.DisplayNames(["en"], { type: "language" });

/** Every shipped pack, sorted by code. */
export const PACKS: PackInfo[] = Object.entries(modules)
  .map(([path, module]) => {
    const file = /([^/]+)\.ts$/.exec(path)![1]!;
    const exports = Object.entries(module);
    if (exports.length !== 1) throw new Error(`src/locales/${file}.ts should export exactly one pack, found ${exports.length}.`);
    const [exportName, pack] = exports[0]!;
    if (pack.code !== file) throw new Error(`src/locales/${file}.ts exports a pack coded "${pack.code}"; the file name and the code should match.`);
    return { code: pack.code, name: english.of(pack.code) ?? pack.code, dir: pack.dir, importPath: `slotsmith/locales/${file}`, exportName };
  })
  .sort((a, b) => (a.code < b.code ? -1 : 1));
