/**
 * Option value
 *
 * What an option is identified by. Ids are strings or numbers because that is
 * what a form stores and a URL carries.
 */
export type OptionValue = string | number;

/**
 * Get option value
 *
 * Reads an option's stable id.
 *
 * @typeParam TOption - The option type.
 */
export type GetOptionValue<TOption> = (option: TOption) => OptionValue;

/**
 * Get option label
 *
 * Reads an option's text. It must be a string: the trigger, the filter,
 * typeahead and the accessible name all read it. Rich rows are the
 * `OptionLabel` slot's job, not this function's.
 *
 * @typeParam TOption - The option type.
 */
export type GetOptionLabel<TOption> = (option: TOption) => string;

/**
 * Option filter
 *
 * Decides whether an option survives the current search text. `false` filters
 * nothing, which is what a remote source wants — the server already did it.
 *
 * @typeParam TOption - The option type.
 */
export type OptionFilter<TOption> = false | ((option: TOption, query: string) => boolean);

/**
 * Autocomplete status
 *
 * What the list is showing, in precedence order. The `Empty`, `Loading` and
 * `Error` parts are chosen from this, so a custom layout can branch on one
 * value instead of re-deriving it from four booleans.
 *
 * - `error` — the last fetch failed. Nothing else renders.
 * - `loading` — a first page is in flight and there is nothing to show yet.
 * - `min-chars` — fewer than `minChars` typed, so no search has run.
 * - `empty` — the search returned nothing.
 * - `ready` — there are options to render.
 */
export type AutocompleteStatus = "error" | "loading" | "min-chars" | "empty" | "ready";

/**
 * Resolved option
 *
 * A value paired with the option behind it. The option is `undefined` when a
 * value has been supplied that no option has yet been seen for. Multiple-mode
 * `onChange` therefore returns an index-aligned array rather than dropping
 * unresolved entries, so values and options always correspond.
 *
 * @typeParam TOption - The option type.
 */
export interface ResolvedOption<TOption> {
  /** The id. */
  value: OptionValue;
  /** The option, when it is known. */
  option?: TOption;
}
