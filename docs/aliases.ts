import { fileURLToPath } from "node:url";

/** Absolute path inside the library source, one level above `docs/`. */
const src = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url));
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Import aliases shared by Astro and Vitest. They point the package name at its
 * source, so pages always show the current components. Mirrored in tsconfig.json.
 */
export const aliases = [
  { find: /^slotsmith\/virtual$/, replacement: src("virtual.ts") },
  { find: /^slotsmith\/(autocomplete|data-table|date-picker|file-uploader|locale|provider)$/, replacement: `${src("$1/index.ts")}` },
  { find: /^slotsmith\/locales\/(.+)$/, replacement: `${src("locales")}/$1.ts` },
  { find: /^slotsmith\/themes\/(.+\.css)$/, replacement: `${src("themes")}/$1` },
  { find: /^slotsmith\/styles\.css$/, replacement: src("styles.css") },
  { find: /^slotsmith\/(autocomplete|data-table|date-picker|file-uploader)\.css$/, replacement: `${src("$1/styles.css")}` },
  { find: /^slotsmith$/, replacement: src("index.ts") },
  { find: /^@samples\/(.+)$/, replacement: `${here("./samples")}/$1` },
  { find: /^@\/(.+)$/, replacement: `${here("./src")}/$1` },
];
