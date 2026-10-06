/**
 * Without undefined
 *
 * Drops `undefined` entries, so an override such as `{ Row: undefined }` or
 * `{ empty: undefined }` keeps the layer below instead of erasing it. Every
 * layered setting uses it: the slots and the labels of each component, and
 * the provider's `components`.
 *
 * It lives here so the components and the provider share one copy without
 * either importing the other for it.
 *
 * @typeParam O - The object type.
 * @param object - The overrides, or nothing.
 * @returns The defined entries.
 *
 * @example
 * ```ts
 * ({ ...fallbacks, ...withoutUndefined({ Row: undefined, Cell }) }); // fallbacks, with Cell replaced
 * ```
 */
export const withoutUndefined = <O extends object>(object: O | undefined): Partial<O> =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => value !== undefined)) as Partial<O>;
