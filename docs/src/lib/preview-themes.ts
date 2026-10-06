/**
 * Preview themes
 *
 * The library's ready-made themes, read from `src/themes/` at build, each
 * confined to the theme preview's element with `scopeTheme`. A theme added to
 * the library shows up in the preview without an edit here.
 */
import { scopeTheme } from "@/lib/scope-theme";

/** The element the preview restyles. */
export const PREVIEW_SCOPE = ".theme-preview";

const themeFiles = import.meta.glob<string>("../../../src/themes/*.css", { query: "?raw", import: "default", eager: true });

/** Theme name (the file name, `ocean`) → its CSS scoped to the preview. */
export const PREVIEW_THEMES: Record<string, string> = Object.fromEntries(
  Object.entries(themeFiles)
    .map(([path, css]) => [/([^/]+)\.css$/.exec(path)![1]!, scopeTheme(css, PREVIEW_SCOPE)] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);
