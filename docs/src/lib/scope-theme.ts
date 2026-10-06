/**
 * Theme scoping
 *
 * A slotsmith theme sets its tokens on `:root` and on `.dark, [data-theme="dark"]`,
 * so loading one restyles the whole page. The theme preview needs the same
 * stylesheet confined to one element: `scopeTheme` moves those two rules under
 * a selector and leaves every other rule as it is. The components resolve the
 * `--ss-*` tokens on their own root, so the scoped values reach them.
 */

const ROOT = ":root";
/** The dark selectors, with either quote style. */
const DARK = /^(?:\.dark|\[data-theme=(["'])dark\1\])$/;
const COMMENT = /\/\*[\s\S]*?\*\//g;
/**
 * A rule's selector list: the text between the previous `{`, `}` or `;` (or the
 * start) and its `{`. The lookbehind leaves that delimiter unconsumed, so a rule
 * nested right inside an at-rule (`@media (…) {:root{…}}`) is matched too.
 */
const RULE = /(?<=^|[{};])([^{};]*)\{/g;

/**
 * Confines a theme stylesheet to one element.
 *
 * @param css - The theme's CSS.
 * @param scope - The selector of the element the theme applies to (`.theme-preview`).
 * @returns The CSS with `:root` rewritten to `scope`, and `.dark`, `[data-theme="dark"]`
 * (alone or as one list) rewritten to `[data-theme="dark"] scope, scope.dark`, so the
 * dark palette follows the site's dark mode or a `.dark` on the element itself. Rules
 * inside at-rules are rewritten the same way; other selectors are untouched.
 * @throws When a `:root` selector survives, such as one combined with other
 * selectors, because it would restyle the whole page.
 */
export function scopeTheme(css: string, scope: string): string {
  // Comments may hold braces or semicolons; park them so the rule matcher never sees them.
  const comments: string[] = [];
  const parked = css.replace(COMMENT, (comment) => `\u0000${comments.push(comment) - 1}\u0000`);

  const scoped = parked.replace(RULE, (whole, prelude: string) => {
    const [, lead = "", selector = "", trail = ""] = /^((?:\s|\u0000\d+\u0000)*)([\s\S]*?)(\s*)$/.exec(prelude) ?? [];
    const parts = selector.split(",").map((part) => part.trim());
    if (parts.length === 1 && parts[0] === ROOT) return `${lead}${scope}${trail}{`;
    if (parts.length > 0 && parts.every((part) => DARK.test(part))) return `${lead}[data-theme="dark"] ${scope}, ${scope}.dark${trail}{`;
    return whole;
  });

  const bare = scoped.replace(/\u0000\d+\u0000/g, "");
  if (bare.includes(ROOT)) throw new Error(`scopeTheme: a ":root" selector could not be confined to ${scope}`);
  return scoped.replace(/\u0000(\d+)\u0000/g, (_, index: string) => comments[Number(index)]!);
}
