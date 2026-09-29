/**
 * @vitest-environment node
 *
 * The data table's prefix was `rdt` before 1.6.0 and is `sdt` now, with no
 * aliases. This guard fails if an old class or token name comes back into the
 * source or the built stylesheets.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** An old class (`rdt`, `rdt__row`, `rdt-loading`) or token (`--rdt-accent`). */
const OLD_NAME = /(?<![\w-])rdt(?![a-zA-Z0-9])|--rdt-/;

/**
 * Files
 *
 * @param folder - A folder to walk.
 * @returns Every file below it, this guard excepted.
 */
const files = (folder: string): string[] =>
  readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) return files(path);
    return path.endsWith("names.test.ts") ? [] : [path];
  });

describe("the old rdt names", () => {
  it("appear nowhere in the source", () => {
    const offenders = files(resolve(process.cwd(), "src")).filter((path) => OLD_NAME.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });

  const dist = resolve(process.cwd(), "dist");
  it.skipIf(!existsSync(join(dist, "styles.css")))("appear nowhere in the built stylesheets", () => {
    const sheets = readdirSync(dist).filter((file) => file.endsWith(".css"));
    expect(sheets.length).toBeGreaterThan(1);
    for (const sheet of sheets) {
      const css = readFileSync(join(dist, sheet), "utf8");
      expect(css, sheet).not.toMatch(/\.rdt\b|\.rdt__|--rdt-/);
      expect(css, sheet).toContain(sheet.startsWith("data-table") || sheet === "styles.css" ? ".sdt__" : "");
    }
  });
});
