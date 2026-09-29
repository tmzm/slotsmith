/**
 * @vitest-environment node
 *
 * `rdt` is not a name this library uses. This guard fails if it comes back
 * into the source, the shipped docs or the built stylesheets — anywhere but
 * this file, which has to name it to guard against it.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** An old class (`rdt`, `rdt__row`, `rdt-loading`) or token (`--rdt-accent`). */
const OLD_NAME = /(?<![\w-])rdt(?![a-zA-Z0-9])|--rdt-/;

/**
 * Files
 *
 * @param root - A file or a folder to walk.
 * @returns Every file at or below it, this guard excepted.
 */
const files = (root: string): string[] => {
  if (root.endsWith("names.test.ts")) return [];
  if (!statSync(root).isDirectory()) return [root];
  return readdirSync(root).flatMap((entry) => files(join(root, entry)));
};

/** Every place the old name must not appear: the source, and every shipped doc. */
const GUARDED_ROOTS = [
  resolve(process.cwd(), "src"),
  resolve(process.cwd(), "README.md"),
  resolve(process.cwd(), "packages/ai/knowledge"),
  resolve(process.cwd(), "packages/ai/README.md"),
];

describe("the old rdt name", () => {
  it("appears nowhere outside this guard", () => {
    const offenders = GUARDED_ROOTS.flatMap(files).filter((path) => OLD_NAME.test(readFileSync(path, "utf8")));
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
