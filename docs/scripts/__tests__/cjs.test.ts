/**
 * The CommonJS note on Getting started names only the entries this test
 * proves: each loads with `require()` in Node while `@tanstack/react-table`
 * is not installed. It reads the built library, so run `pnpm build` at the
 * repository root first.
 */
import { existsSync, readdirSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const dist = fileURLToPath(new URL("../../../dist/", import.meta.url));
const require = createRequire(import.meta.url);
const TABLE = "@tanstack/react-table";

/** Every locale pack the library ships, from its sources, so a pack missing from the build fails too. */
const PACKS = readdirSync(fileURLToPath(new URL("../../../src/locales/", import.meta.url)))
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.slice(0, -3));

type Resolve = (request: string, ...rest: unknown[]) => string;
const mod = Module as unknown as { _resolveFilename: Resolve };
let original: Resolve;

/** Requires a built entry with the table package unresolvable, from a clean module cache. */
function load(entry: string): unknown {
  for (const key of Object.keys(require.cache)) if (key.startsWith(dist)) delete require.cache[key];
  return require(`${dist}${entry}`);
}

describe("CommonJS entries without @tanstack/react-table", () => {
  beforeEach(() => {
    if (!existsSync(`${dist}index.cjs`)) throw new Error("The library is not built: run `pnpm build` at the repository root.");
    original = mod._resolveFilename;
    mod._resolveFilename = function (request, ...rest) {
      if (request === TABLE || request.startsWith(`${TABLE}/`)) {
        throw Object.assign(new Error(`Cannot find module '${request}'`), { code: "MODULE_NOT_FOUND" });
      }
      return original.call(this, request, ...rest);
    };
  });

  afterEach(() => {
    mod._resolveFilename = original;
  });

  it("makes the table package unresolvable", () => {
    expect(() => require(TABLE)).toThrow(/Cannot find module/);
  });

  it.each([
    ["autocomplete.cjs", "Autocomplete"],
    ["date-picker.cjs", "DatePicker"],
    ["file-uploader.cjs", "FileUploader"],
    ["provider.cjs", "SlotsmithProvider"],
    ["locale.cjs", "defineLocale"],
  ])("require(dist/%s) works and exports %s", (entry, name) => {
    const exports = load(entry) as Record<string, unknown>;
    expect(exports[name]).toBeDefined();
  });

  it.each(PACKS)("require(dist/locales/%s.cjs) works and exports its pack", (code) => {
    const exports = load(`locales/${code}.cjs`) as Record<string, { code?: string }>;
    expect(exports[code.replace("-", "")]?.code).toBe(code);
  });

  it("require(dist/data-table.cjs) needs the table package", () => {
    expect(() => load("data-table.cjs")).toThrow(/Cannot find module '@tanstack\/react-table'/);
  });

  it("records what the main entry does", () => {
    let result: string;
    try {
      load("index.cjs");
      result = "loads";
    } catch (error) {
      result = `throws: ${(error as Error).message.split("\n")[0]}`;
    }
    console.log(`[cjs] require("slotsmith") without ${TABLE}: ${result}`);
    expect(result).toBeTypeOf("string");
  });
});
