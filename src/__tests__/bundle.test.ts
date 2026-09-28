/**
 * @vitest-environment node
 *
 * This file inspects build output rather than rendered markup, and esbuild's
 * API needs Node's own globals — jsdom's `TextEncoder` is not the one it
 * expects.
 */
import { build, type Plugin } from "esbuild";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  datePicker: "sdp__",
} as const;

type Component = keyof typeof MARKERS;

/** A string from the Arabic pack. Its presence proves a pack was bundled. */
const ARABIC_MARKER = "لا توجد بيانات";

/**
 * Bundled with
 *
 * The one allowed crossing: the data table's page-size fallback is the
 * autocomplete, used as a single select, so the table (and
 * `VirtualDataTable`) ships it, in its JavaScript and in its stylesheet. The
 * other direction stays closed — the autocomplete never carries the table —
 * and no other component, pack or provider may pull in a component.
 */
const BUNDLED_WITH: Partial<Record<Component, Component[]>> = {
  dataTable: ["autocomplete"],
};

/**
 * Other markers
 *
 * @param component - The component a bundle is meant to contain.
 * @returns Every other component's marker, none of which may appear in it,
 * apart from those of the components it is allowed to bundle.
 */
const othersThan = (component: Component) =>
  (Object.keys(MARKERS) as Component[])
    .filter((key) => key !== component && !BUNDLED_WITH[component]?.includes(key))
    .map((key) => MARKERS[key]);

/**
 * Shipped markers
 *
 * @param component - The component a bundle is meant to contain.
 * @returns Its own marker and those of the components it bundles, all of
 * which must appear in it.
 */
const shippedWith = (component: Component) =>
  [component, ...(BUNDLED_WITH[component] ?? [])].map((key) => MARKERS[key]);

const dist = (file: string) => resolve(process.cwd(), "dist", file);

/**
 * Package alias
 *
 * Snippets below import bare `slotsmith/...` specifiers, the way an
 * application does through the package's `exports` map. esbuild has no
 * `node_modules/slotsmith` to resolve against here, so this plugin points
 * each specifier straight at the built file its `exports` entry names.
 */
const packageAlias: Plugin = {
  name: "slotsmith-alias",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^slotsmith(\/.*)?$/ }, (args) => ({
      path: dist(`${args.path === "slotsmith" ? "index" : args.path.slice("slotsmith/".length)}.js`),
    }));
  },
};

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
    // Keeps non-ASCII text, such as the Arabic marker, literal instead of
    // escaping it to \u sequences, so a `toContain` check on it still works.
    charset: "utf8",
    format,
    platform: format === "cjs" ? "node" : "browser",
    external: EXTERNAL,
    plugins: [packageAlias],
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

/**
 * Entries
 *
 * Each component's own entry point, the export that renders it, and its
 * stylesheet, so every isolation check runs for all of them.
 */
const ENTRIES = [
  { component: "autocomplete", file: "autocomplete", name: "Autocomplete" },
  { component: "dataTable", file: "data-table", name: "DataTable" },
  { component: "datePicker", file: "date-picker", name: "DatePicker" },
  { component: "fileUploader", file: "file-uploader", name: "FileUploader" },
] as const satisfies readonly { component: Component; file: string; name: string }[];

describe.skipIf(!built)("what an application actually bundles", () => {
  it.each(ENTRIES)("drops everything but $name from a main-entry import", async ({ component, name }) => {
    const code = await bundle(`
      import { ${name} } from ${JSON.stringify(dist("index.js"))};
      console.log(${name});
    `);

    for (const marker of shippedWith(component)) expect(code).toContain(marker);
    for (const marker of othersThan(component)) expect(code).not.toContain(marker);
  });

  it.each(["useAutocomplete", "useDatePicker"])(
    "drops the component bodies when only %s is imported",
    async (hook) => {
      const code = await bundle(`
        import { ${hook} } from ${JSON.stringify(dist("index.js"))};
        console.log(${hook});
      `);

      for (const marker of Object.values(MARKERS)) expect(code).not.toContain(marker);
    },
  );

  it("keeps everything an application does import", async () => {
    const names = ENTRIES.map((entry) => entry.name).join(", ");
    const code = await bundle(`
      import { ${names} } from ${JSON.stringify(dist("index.js"))};
      console.log(${names});
    `);

    for (const marker of Object.values(MARKERS)) expect(code).toContain(marker);
  });

  it.each(ENTRIES)("isolates $name behind its own entry point", async ({ component, file, name }) => {
    const code = await bundle(`
      import { ${name} } from ${JSON.stringify(dist(`${file}.js`))};
      console.log(${name});
    `);

    for (const marker of shippedWith(component)) expect(code).toContain(marker);
    for (const marker of othersThan(component)) expect(code).not.toContain(marker);
  });

  it("bundles the autocomplete, and nothing else, with VirtualDataTable", async () => {
    const code = await bundle(`
      import { VirtualDataTable } from ${JSON.stringify(dist("virtual.js"))};
      console.log(VirtualDataTable);
    `);

    for (const marker of shippedWith("dataTable")) expect(code).toContain(marker);
    for (const marker of othersThan("dataTable")) expect(code).not.toContain(marker);
  });

  /**
   * The date picker and the autocomplete both position a popup and both keep
   * uncontrolled state, through the same two hooks. Those hooks must land in
   * one chunk that both entries import, rather than in a copy per entry.
   */
  it("shares the popup and state hooks between entries instead of copying them", () => {
    const imports = (file: string) =>
      new Set(readFileSync(dist(file), "utf8").match(/chunk-[A-Z0-9]+\.js/g) ?? []);
    const shared = [...imports("autocomplete.js")].filter((chunk) => imports("date-picker.js").has(chunk));
    const positioners = readdirSync(dist("."))
      .filter((file) => /^chunk-.*\.js$/.test(file))
      .filter((file) => readFileSync(dist(file), "utf8").includes("function usePopupPosition"));

    expect(positioners).toHaveLength(1);
    expect(shared).toContain(positioners[0]);
    for (const marker of Object.values(MARKERS)) {
      expect(readFileSync(dist(positioners[0]!), "utf8")).not.toContain(marker);
    }
  });

  /**
   * CommonJS cannot be tree-shaken, because `require` resolves at run time.
   * The per-component entry is the only way a CommonJS consumer avoids paying
   * for all of them, which is the reason those entries exist.
   *
   * The uploader is left out: it borrows the table's class-name helper, so its
   * CommonJS entry still carries the table's fallbacks. Only ES module tree
   * shaking, checked above, drops them.
   */
  it.each(ENTRIES.filter((entry) => entry.component === "autocomplete" || entry.component === "datePicker"))(
    "gives CommonJS consumers a way to import $name alone",
    async ({ component, file, name }) => {
      const barrel = await bundle(
        `const { ${name} } = require(${JSON.stringify(dist("index.cjs"))}); console.log(${name});`,
        "cjs",
      );
      const entry = await bundle(
        `const { ${name} } = require(${JSON.stringify(dist(`${file}.cjs`))}); console.log(${name});`,
        "cjs",
      );

      expect(barrel).toContain(MARKERS.dataTable);
      expect(entry).toContain(MARKERS[component]);
      for (const marker of othersThan(component)) expect(entry).not.toContain(marker);
      expect(entry.length).toBeLessThan(barrel.length / 2);
    },
  );

  /**
   * The uploader's CommonJS entry carries the table's fallbacks (see above),
   * but the autocomplete the table's page size now uses must not come along
   * with them.
   */
  it("keeps the autocomplete out of the uploader's CommonJS entry", async () => {
    const entry = await bundle(
      `const { FileUploader } = require(${JSON.stringify(dist("file-uploader.cjs"))}); console.log(FileUploader);`,
      "cjs",
    );

    expect(entry).toContain(MARKERS.fileUploader);
    expect(entry).not.toContain(MARKERS.autocomplete);
    expect(entry).not.toContain(MARKERS.datePicker);
  });
});

describe.skipIf(!built)("the stylesheets", () => {
  it("ships the whole set", () => {
    const whole = readFileSync(dist("styles.css"), "utf8");
    for (const marker of Object.values(MARKERS)) expect(whole).toContain(marker);
  });

  it.each(ENTRIES)("ships $name's styles on their own", ({ component, file }) => {
    const whole = readFileSync(dist("styles.css"), "utf8");
    const one = readFileSync(dist(`${file}.styles.css`), "utf8");

    /** Nothing can tree-shake CSS, so the per-component file must stand alone. */
    for (const marker of shippedWith(component)) expect(one).toContain(marker);
    for (const marker of othersThan(component)) expect(one).not.toContain(marker);
    expect(one.length).toBeLessThan(whole.length / (BUNDLED_WITH[component] ? 1.5 : 2));
  });

  /**
   * The table's sheet imports the autocomplete's, and so does the whole one:
   * the bundler must keep a single copy of those rules, not one per import.
   */
  it("ships the autocomplete's rules once in the whole set", () => {
    const whole = readFileSync(dist("styles.css"), "utf8");
    expect(whole.match(/\.sac__trigger\s*\{/g)).toHaveLength(1);
    expect(whole.match(/\.rdt__table\s*\{/g)).toHaveLength(1);
  });
});

describe.skipIf(!built)("locales", () => {
  it("keeps every pack out of a component's bundle", async () => {
    const code = await bundle(`import { DataTable } from "slotsmith/data-table"; console.log(DataTable);`);
    expect(code).not.toContain(ARABIC_MARKER);
  });

  it("keeps every component out of a pack's bundle", async () => {
    const code = await bundle(`import { ar } from "slotsmith/locales/ar"; console.log(ar);`);
    expect(code).toContain(ARABIC_MARKER);
    for (const marker of Object.values(MARKERS)) expect(code).not.toContain(marker);
  });

  it("keeps the provider free of components and packs", async () => {
    const code = await bundle(`import { SlotsmithProvider } from "slotsmith/locale"; console.log(SlotsmithProvider);`);
    expect(code).not.toContain(ARABIC_MARKER);
    for (const marker of Object.values(MARKERS)) expect(code).not.toContain(marker);
  });

  it("ships the packs without a client directive, so they import anywhere", () => {
    expect(readFileSync(dist("locales/ar.js"), "utf8").startsWith('"use client"')).toBe(false);
    expect(readFileSync(dist("locale.js"), "utf8").startsWith('"use client"')).toBe(true);
  });
});

describe.skipIf(!built)("the provider entry point", () => {
  it("keeps components and packs out of slotsmith/provider", async () => {
    const code = await bundle(`import { SlotsmithProvider } from "slotsmith/provider"; console.log(SlotsmithProvider);`);
    expect(code).not.toContain(ARABIC_MARKER);
    for (const marker of Object.values(MARKERS)) expect(code).not.toContain(marker);
  });

  it("ships dist/provider.js with the client directive", () => {
    expect(readFileSync(dist("provider.js"), "utf8").startsWith('"use client"')).toBe(true);
  });

  /**
   * `slotsmith/locale` still re-exports the provider for compatibility, so an
   * app on either import path must share the same context: a provider built
   * from one entry has to be read correctly by a hook read from the other.
   */
  it("gives the same SlotsmithProvider whether imported from slotsmith/provider or slotsmith/locale", async () => {
    const fromProvider = await import(pathToFileURL(dist("provider.js")).href);
    const fromLocale = await import(pathToFileURL(dist("locale.js")).href);

    expect(fromProvider.SlotsmithProvider).toBe(fromLocale.SlotsmithProvider);

    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    function Probe() {
      const { code } = fromLocale.useSlotsmithLocale();
      return createElement("span", null, code);
    }
    const html = renderToStaticMarkup(
      createElement(fromProvider.SlotsmithProvider, { locale: "fr" }, createElement(Probe)),
    );
    expect(html).toContain("fr");
  });
});
