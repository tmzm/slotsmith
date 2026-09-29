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

/** Each component's own token prefix, shared with its class prefix. */
export const TOKEN_PREFIX = {
  "data-table": "sdt",
  autocomplete: "sac",
  "date-picker": "sdp",
  "file-uploader": "sfu",
} as const;

/**
 * Keeps a component's public tokens: its own prefix and the shared `--ss-*`
 * layer. Other components' tokens (set only to restyle an embedded part) and
 * the internal `--<prefix>-size-*` tokens are dropped.
 *
 * @param tokens - Every token found in the component's stylesheet.
 * @param prefix - The component's prefix, e.g. `sdt`.
 * @returns The public tokens, in the same order.
 */
export function ownTokens(tokens: string[], prefix: string): string[] {
  return tokens.filter((token) => {
    if (token.startsWith("--ss-")) return true;
    return token.startsWith(`--${prefix}-`) && !token.startsWith(`--${prefix}-size-`);
  });
}
