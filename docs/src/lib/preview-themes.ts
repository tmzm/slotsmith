/**
 * Preview themes
 *
 * The library's ready-made themes, read from `src/themes/` at build, each
 * confined to the theme preview's element with `scopeTheme`. A theme added to
 * the library shows up in the preview without an edit here.
 */
import { scopeTheme, tokenRules } from "@/lib/scope-theme";

/** The element the preview restyles. */
export const PREVIEW_SCOPE = ".theme-preview";

const themeFiles = import.meta.glob<string>("../../../src/themes/*.css", { query: "?raw", import: "default", eager: true });
const componentFiles = import.meta.glob<string>("../../../src/*/styles.css", { query: "?raw", import: "default", eager: true });

/** Theme name (the file name, `ocean`) → its CSS scoped to the preview. */
export const PREVIEW_THEMES: Record<string, string> = Object.fromEntries(
  Object.entries(themeFiles)
    .map(([path, css]) => [/([^/]+)\.css$/.exec(path)![1]!, scopeTheme(css, PREVIEW_SCOPE)] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
);

/**
 * The components' own token rules, declared again on the preview element so
 * they read the theme's `--ss-*` values there (see `tokenRules`).
 */
export const PREVIEW_BASE = scopeTheme(Object.values(componentFiles).map(tokenRules).join("\n"), PREVIEW_SCOPE);
