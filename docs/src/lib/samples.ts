/**
 * Sample sources
 *
 * Every file under `docs/samples/` as text, keyed by its name: the path under
 * `samples/` without extension (`data-table/quick-start`). Demos render the
 * `.tsx` files and show the same text as their code, so the code on a page is
 * always the code that runs.
 */

export type SampleLang = "tsx" | "ts" | "js" | "css" | "json" | "bash";

export interface SampleSource {
  code: string;
  lang: SampleLang;
}

const LANG_BY_EXTENSION: Record<string, SampleLang> = { tsx: "tsx", ts: "ts", cjs: "js", css: "css", json: "json", sh: "bash" };

const files = import.meta.glob<string>([
    "/samples/**/*.{tsx,ts,cjs,css,json,sh}",
    "!/samples/tsconfig.json",
    "!/samples/**/__tests__/**",
    // The framework examples are small apps: their installs and builds are not samples.
    "!/samples/**/node_modules/**",
    "!/samples/**/.next/**",
    "!/samples/**/dist/**",
  ], {
  query: "?raw",
  import: "default",
  eager: true,
});

export const SAMPLE_SOURCES: Record<string, SampleSource> = {};

for (const [path, code] of Object.entries(files)) {
  const match = /^\/samples\/(.+)\.(\w+)$/.exec(path);
  const name = match?.[1];
  const lang = match?.[2] ? LANG_BY_EXTENSION[match[2]] : undefined;
  if (!name || !lang) throw new Error(`Unsupported sample file "${path}".`);
  // A name is the path without extension, so two files differing only in extension would collide.
  if (SAMPLE_SOURCES[name]) throw new Error(`Two samples are named "${name}". Rename one of them.`);
  SAMPLE_SOURCES[name] = { code, lang };
}

/**
 * The source of one sample.
 *
 * @param name - The sample's path under `samples/` without extension.
 * @returns Its text and the language to highlight it as.
 * @throws `Unknown sample "<name>"` when no such file exists, so a typo fails the build.
 */
export function sampleSource(name: string): SampleSource {
  const found = SAMPLE_SOURCES[name];
  if (!found) throw new Error(`Unknown sample "${name}". Samples live in docs/samples/<area>/<name>.tsx.`);
  return found;
}

/** Every sample name, sorted. */
export function sampleNames(): string[] {
  return Object.keys(SAMPLE_SOURCES).sort();
}

/** The Shiki theme for sample code: its colours come from `--astro-code-*`, set in `styles/code.css`. */
export const CODE_THEME = "css-variables";
