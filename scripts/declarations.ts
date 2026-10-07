/**
 * Declarations
 *
 * Finishes the declaration files `tsc` writes into `dist`, so they resolve
 * under every `moduleResolution` an app may use, not only `bundler`:
 *
 * - Every relative specifier gets its extension: `./context` becomes
 *   `./context.js`, and a folder becomes `./provider/index.js`. The package is
 *   `"type": "module"`, so Node's resolution (`node16`, `nodenext`) reads
 *   each `.d.ts` as an ES module and refuses an extensionless relative import.
 * - Each `.d.ts` gets a `.d.cts` twin whose specifiers end in `.cjs`. The
 *   `require` condition points at those, so a CommonJS app types the
 *   CommonJS build instead of being told it is importing an ES module.
 *
 * The specifier is resolved the way a type checker resolves it, file before
 * folder, and one that resolves to neither fails the build rather than ship a
 * declaration that silently types as `any`.
 *
 * Runs at the end of `pnpm build`, after `tsc`: `node scripts/declarations.ts`.
 *
 * @packageDocumentation
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** A relative specifier in an import, a re-export or an `import()` type. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\2/g;

/**
 * Declaration files
 *
 * @param dir - The folder to walk.
 * @returns Every `.d.ts` below it.
 */
function declarationFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return declarationFiles(path);
    return entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

/**
 * With extension
 *
 * @param file - The declaration file the specifier appears in.
 * @param specifier - A relative specifier, with or without its extension.
 * @throws When the specifier names neither a declaration file nor a folder with one.
 * @returns The specifier naming its `.js` file in full.
 */
function withExtension(file: string, specifier: string): string {
  if (specifier.endsWith(".js")) return specifier;
  const target = resolve(dirname(file), specifier);
  if (existsSync(`${target}.d.ts`)) return `${specifier}.js`;
  if (existsSync(join(target, "index.d.ts"))) return `${specifier.replace(/\/$/, "")}/index.js`;
  throw new Error(`${file}: "${specifier}" resolves to no declaration file`);
}

const dist = resolve(import.meta.dirname, "..", "dist");

for (const file of declarationFiles(dist)) {
  const esm = readFileSync(file, "utf8").replace(
    SPECIFIER,
    (_, lead: string, quote: string, specifier: string) => `${lead}${quote}${withExtension(file, specifier)}${quote}`,
  );
  const cjs = esm.replace(
    SPECIFIER,
    (_, lead: string, quote: string, specifier: string) => `${lead}${quote}${specifier.replace(/\.js$/, ".cjs")}${quote}`,
  );
  writeFileSync(file, esm);
  writeFileSync(file.replace(/\.d\.ts$/, ".d.cts"), cjs);
}
