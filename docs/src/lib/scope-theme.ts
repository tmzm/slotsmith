/**
 * Theme scoping
 *
 * A slotsmith theme sets its tokens on `:root` and on `.dark, [data-theme="dark"]`,
 * so loading one restyles the whole page. The theme preview needs the same
 * stylesheet confined to one element: `scopeTheme` moves those two rules under
 * a selector and leaves every other rule as it is.
 */

const ROOT = ":root";
const DARK = new Set([".dark", '[data-theme="dark"]']);
const COMMENT = /\/\*[\s\S]*?\*\//g;
/** A rule's selector list: the text between the previous `{`, `}` or `;` (or the start) and its `{`. */
const RULE = /(^|[{};])([^{};]*)\{/g;

/**
 * Confines a theme stylesheet to one element.
 *
 * @param css - The theme's CSS.
 * @param scope - The selector of the element the theme applies to (`.theme-preview`).
 * @returns The CSS with `:root` rewritten to `scope`, and `.dark`, `[data-theme="dark"]`
 * (alone or as one list) rewritten to `[data-theme="dark"] scope, scope.dark`, so the
 * dark palette follows the site's dark mode or a `.dark` on the element itself. Other
 * selectors are untouched.
 */
export function scopeTheme(css: string, scope: string): string {
  // Comments may hold braces or semicolons; park them so the rule matcher never sees them.
  const comments: string[] = [];
  const parked = css.replace(COMMENT, (comment) => `\u0000${comments.push(comment) - 1}\u0000`);

  const scoped = parked.replace(RULE, (whole, before: string, prelude: string) => {
    const [, lead = "", selector = "", trail = ""] = /^((?:\s|\u0000\d+\u0000)*)([\s\S]*?)(\s*)$/.exec(prelude) ?? [];
    const parts = selector.split(",").map((part) => part.trim());
    if (parts.length === 1 && parts[0] === ROOT) return `${before}${lead}${scope}${trail}{`;
    if (parts.length > 0 && parts.every((part) => DARK.has(part))) return `${before}${lead}[data-theme="dark"] ${scope}, ${scope}.dark${trail}{`;
    return whole;
  });

  return scoped.replace(/\u0000(\d+)\u0000/g, (_, index: string) => comments[Number(index)]!);
}

/**
 * The token rules of a component stylesheet: its `:root` rule and its
 * `.dark, [data-theme="dark"]` rule, without the rules that style parts.
 *
 * A component token such as `--sdt-accent: var(--ss-accent, …)` is resolved on
 * the element that declares it, `:root`, so `--ss-*` values set on a smaller
 * element never reach it. Passing these rules through `scopeTheme` declares
 * the component tokens again on the scope element, where they read the
 * scope's `--ss-*` values.
 *
 * @param css - A component stylesheet (`src/data-table/styles.css`).
 * @returns Those two rules, each with its body, one per line group.
 */
export function tokenRules(css: string): string {
  const bare = css.replace(COMMENT, "");
  const rules: string[] = [];
  for (const match of bare.matchAll(/(?<=^|[{};])([^{};]*)\{([^{}]*)\}/g)) {
    const parts = match[1]!.split(",").map((part) => part.trim());
    const tokens = (parts.length === 1 && parts[0] === ROOT) || parts.every((part) => DARK.has(part));
    if (tokens) rules.push(`${parts.join(", ")} {${match[2]}}`);
  }
  return rules.join("\n");
}
