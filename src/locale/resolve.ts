import { directionOf } from "./direction";
import type {
  LocaleInput,
  LocaleSectionName,
  LocaleSections,
  SlotsmithLocale,
  TextDirection,
} from "./types";

/**
 * Resolved locale
 *
 * What a `locale` prop comes to: the tag to format with, the direction, and
 * the pack holding the labels, when one was found.
 */
export interface ResolvedLocale {
  code: string;
  dir: TextDirection;
  pack: SlotsmithLocale | undefined;
}

const languageOf = (code: string) => code.toLowerCase().split(/[-_]/)[0] ?? "";

/**
 * Find a pack
 *
 * @param code - The tag an app asked for.
 * @param packs - The packs it registered.
 * @returns The pack with that exact tag, else the pack of the bare language,
 *   else any pack of the same language.
 */
export function findPack(code: string, packs: readonly SlotsmithLocale[]): SlotsmithLocale | undefined {
  const wanted = code.toLowerCase();
  const language = languageOf(code);
  return (
    packs.find((pack) => pack.code.toLowerCase() === wanted) ??
    packs.find((pack) => pack.code.toLowerCase() === language) ??
    packs.find((pack) => languageOf(pack.code) === language)
  );
}

/**
 * Node's `process`, typed locally
 *
 * `@types/node`'s ambient global is not visible under every tsconfig this
 * file is built with (the declaration-emit pass excludes it), so this types
 * only the one property read below instead of depending on that ambient
 * global. The runtime check stays a literal `process.env.NODE_ENV` so a
 * consumer's bundler can still replace it at build time.
 */
declare const process: { env: { NODE_ENV?: string } } | undefined;

const warned = new Set<string>();

/** Forgets which tags were warned about. For tests. */
export function resetLocaleWarnings(): void {
  warned.clear();
}

/**
 * Warn about an unregistered locale
 *
 * Once per tag and only in development: a missing pack is a setup mistake to
 * notice while building, not something to log in production. `process` is
 * guarded because a browser bundle that skips define-time replacement of
 * `process.env.NODE_ENV` has no such global at all.
 */
function warnUnregistered(code: string): void {
  const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production";
  if (isProduction || warned.has(code)) return;
  warned.add(code);
  console.warn(
    `slotsmith: no locale pack is registered for "${code}", so labels stay in English. ` +
      `Import the pack and pass it to <SlotsmithProvider locales={[…]}>, or pass the locale object itself.`,
  );
}

/**
 * Resolve a locale
 *
 * @param input - A locale object, a tag, or nothing.
 * @param packs - The packs registered with the nearest provider.
 * @returns The resolved locale, or `undefined` when there was no input.
 */
export function resolveLocale(
  input: LocaleInput | undefined,
  packs: readonly SlotsmithLocale[],
): ResolvedLocale | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== "string") return { code: input.code, dir: input.dir, pack: input };

  const pack = findPack(input, packs);
  if (!pack && languageOf(input) !== "en") warnUnregistered(input);
  return { code: input, dir: pack?.dir ?? directionOf(input), pack };
}

/** Function sections are built once per pack and tag, so label objects keep their identity across renders. */
const built = new WeakMap<SlotsmithLocale, Map<string, unknown>>();

/**
 * Section of a resolved locale
 *
 * @param resolved - The resolved locale.
 * @param name - The section to read.
 * @returns The section's labels, or `undefined` when the pack has none.
 */
export function sectionOf<K extends LocaleSectionName>(
  resolved: ResolvedLocale | undefined,
  name: K,
): LocaleSections[K] | undefined {
  const pack = resolved?.pack;
  const section = pack?.[name];
  if (!pack || !resolved || section === undefined) return undefined;
  if (typeof section !== "function") return section as LocaleSections[K];

  let cache = built.get(pack);
  if (!cache) built.set(pack, (cache = new Map()));
  const key = `${name}:${resolved.code}`;
  if (!cache.has(key)) cache.set(key, (section as (code: string) => LocaleSections[K])(resolved.code));
  return cache.get(key) as LocaleSections[K];
}
