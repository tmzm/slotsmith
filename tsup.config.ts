import { readdirSync, rmSync } from "node:fs";
import { defineConfig } from "tsup";

/**
 * Pre-clean
 *
 * tsup loads this file once and then runs every config in the array below
 * against that single load, so a `clean: true` on one config and a build
 * already under way for the other can race: whichever config cleans last
 * deletes output the other just wrote. Cleaning once here, before either
 * config runs, avoids that race entirely — so both configs below set
 * `clean: false`.
 */
rmSync("dist", { recursive: true, force: true });

const external = ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual", "@floating-ui/react-dom"];

/** One entry per file in `src/locales`, so a new pack is built the moment it is added. */
const locales = Object.fromEntries(
  readdirSync("src/locales")
    .filter((file) => file.endsWith(".ts"))
    .map((file) => [`locales/${file.slice(0, -3)}`, `src/locales/${file}`]),
);

/** One entry per file in `src/themes`, so a new theme is built the moment it is added. */
const themes = Object.fromEntries(
  readdirSync("src/themes")
    .filter((file) => file.endsWith(".css"))
    .map((file) => [`themes/${file.slice(0, -4)}`, `src/themes/${file}`]),
);

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      virtual: "src/virtual.ts",
      // One entry per component, so an app can import exactly the one it uses.
      autocomplete: "src/autocomplete/index.ts",
      "data-table": "src/data-table/index.ts",
      "date-picker": "src/date-picker/index.ts",
      "file-uploader": "src/file-uploader/index.ts",
      // The helper that types a custom locale.
      locale: "src/locale/index.ts",
      // SlotsmithProvider, and the future home of any setting shared across components.
      provider: "src/provider/index.ts",
      // The whole stylesheet, and one per component.
      styles: "src/styles.css",
      "autocomplete.styles": "src/autocomplete/styles.css",
      "data-table.styles": "src/data-table/styles.css",
      "date-picker.styles": "src/date-picker/styles.css",
      "file-uploader.styles": "src/file-uploader/styles.css",
      // Token-only theme stylesheets, one per file in `src/themes`.
      ...themes,
    },
    format: ["esm", "cjs"],
    external,
    clean: false,
    splitting: true,
    // Every entry renders client components (hooks, context).
    banner: { js: '"use client";' },
  },
  {
    // The packs are plain data. Without the client directive they can be
    // imported from any module, server or client.
    entry: locales,
    format: ["esm", "cjs"],
    external,
    clean: false,
    splitting: false,
  },
]);
