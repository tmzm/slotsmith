/**
 * Class names
 *
 * Joins the truthy class names with spaces.
 *
 * Lives here rather than beside the data table's fallbacks, which import the
 * autocomplete: a component that only needs this helper must not reach it
 * through them, or a CommonJS build of that component carries both.
 *
 * @param classes - Class names; falsy values are skipped.
 * @returns The joined class names, or `undefined` when there are none.
 *
 * @example
 * ```ts
 * cx("rdt__row", selected && "is-selected"); // "rdt__row is-selected"
 * ```
 */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ") || undefined;
