/**
 * The custom properties a stylesheet sets or reads: `--s<prefix>-<name>`, in
 * declarations and `var()` calls. Comments are ignored, so a prose mention such
 * as "--sdt-*" is not a token.
 *
 * @param css - The stylesheet source.
 * @returns Sorted, unique property names.
 */
export function extractTokens(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const names = code.match(/--s[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*(?![a-z0-9-])/g) ?? [];
  return [...new Set(names)].sort();
}
