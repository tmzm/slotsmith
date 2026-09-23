/**
 * @vitest-environment node
 *
 * This file inspects build output rather than rendered markup, and esbuild's
 * API needs Node's own globals — jsdom's `TextEncoder` is not the one it
 * expects.
 */
import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Markers
 *
 * Each component's class-name prefix. They are string literals, so a minifier
 * cannot rename them away — their presence in a bundle proves that the
 * component's code survived tree shaking, and their absence proves it did not.
 */
const MARKERS = {
  dataTable: "rdt__",
  fileUploader: "sfu__",
  autocomplete: "sac__",
} as const;

const dist = (file: string) => resolve(process.cwd(), "dist", file);

/** The peers and React, which an app supplies rather than bundling from here. */
const EXTERNAL = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "@tanstack/react-table",
  "@tanstack/react-virtual",
  "@floating-ui/react-dom",
];

/**
 * Bundle
 *
 * Bundles a snippet against the built output the way an application would.
 *
 * @param source - The entry source.
 * @param format - Module format to emit.
 * @returns The bundled code.
 */
async function bundle(
  source: string,
  format: "esm" | "cjs" = "esm",
): Promise<string> {
  const result = await build({
    stdin: { contents: source, resolveDir: process.cwd(), loader: "js" },
    bundle: true,
    write: false,
    minify: true,
    format,
    platform: format === "cjs" ? "node" : "browser",
    external: EXTERNAL,
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

/**
 * Built
 *
 * Whether `pnpm build` has been run. These tests inspect the published output,
 * so they are skipped rather than failing when it is absent.
 */
const built = existsSync(dist("index.js"));

describe.skipIf(!built)("what an application actually bundles", () => {
  it("drops the components an ES module import never mentions", async () => {
    const code = await bundle(`
      import { Autocomplete } from ${JSON.stringify(dist("index.js"))};
      console.log(Autocomplete);
    `);

    expect(code).toContain(MARKERS.autocomplete);
    expect(code).not.toContain(MARKERS.dataTable);
    expect(code).not.toContain(MARKERS.fileUploader);
  });

  it("drops the component bodies when only a hook is imported", async () => {
    const code = await bundle(`
      import { useAutocomplete } from ${JSON.stringify(dist("index.js"))};
      console.log(useAutocomplete);
    `);

    for (const marker of Object.values(MARKERS))
      expect(code).not.toContain(marker);
  });

  it("keeps everything an application does import", async () => {
    const code = await bundle(`
      import { Autocomplete, DataTable, FileUploader } from ${JSON.stringify(dist("index.js"))};
      console.log(Autocomplete, DataTable, FileUploader);
    `);

    for (const marker of Object.values(MARKERS)) expect(code).toContain(marker);
  });

  it("isolates each component behind its own entry point", async () => {
    const code = await bundle(`
      import { Autocomplete } from ${JSON.stringify(dist("autocomplete.js"))};
      console.log(Autocomplete);
    `);

    expect(code).toContain(MARKERS.autocomplete);
    expect(code).not.toContain(MARKERS.dataTable);
    expect(code).not.toContain(MARKERS.fileUploader);
  });

  /**
   * CommonJS cannot be tree-shaken, because `require` resolves at run time.
   * The per-component entry is the only way a CommonJS consumer avoids paying
   * for all three, which is the reason those entries exist.
   */
  it("gives CommonJS consumers a way to import one component", async () => {
    const barrel = await bundle(
      `const { Autocomplete } = require(${JSON.stringify(dist("index.cjs"))}); console.log(Autocomplete);`,
      "cjs",
    );
    const entry = await bundle(
      `const { Autocomplete } = require(${JSON.stringify(dist("autocomplete.cjs"))}); console.log(Autocomplete);`,
      "cjs",
    );

    expect(barrel).toContain(MARKERS.dataTable);
    expect(entry).not.toContain(MARKERS.dataTable);
    expect(entry).not.toContain(MARKERS.fileUploader);
    expect(entry.length).toBeLessThan(barrel.length / 2);
  });
});

describe.skipIf(!built)("the stylesheets", () => {
  it("ships one file per component as well as the whole set", () => {
    const whole = readFileSync(dist("styles.css"), "utf8");
    const one = readFileSync(dist("autocomplete.styles.css"), "utf8");

    expect(whole).toContain(MARKERS.autocomplete);
    expect(whole).toContain(MARKERS.dataTable);

    /** Nothing can tree-shake CSS, so the per-component file must stand alone. */
    expect(one).toContain(MARKERS.autocomplete);
    expect(one).not.toContain(MARKERS.dataTable);
    expect(one).not.toContain(MARKERS.fileUploader);
    expect(one.length).toBeLessThan(whole.length / 2);
  });
});
