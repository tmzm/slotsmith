import { en } from "./messages.en";
import { ar } from "./messages.ar";

export type Lang = "en" | "ar";
export const LANGS: readonly Lang[] = ["en", "ar"];
export type MessageKey = keyof typeof en;

const catalogs: Record<Lang, Record<MessageKey, string>> = { en, ar };

/** Looks up a message and fills its `{name}` placeholders. */
export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const message = catalogs[lang][key];
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Prefixes a site path with the language: ("ar", "/theming/") gives "/ar/theming/". */
export function localePath(lang: Lang, path: string): string {
  if (lang === "en") return path;
  return path === "/" ? "/ar/" : `/ar${path}`;
}

/** Splits the language prefix off a pathname. */
export function stripLang(pathname: string): { lang: Lang; path: string } {
  if (pathname === "/ar" || pathname === "/ar/") return { lang: "ar", path: "/" };
  if (pathname.startsWith("/ar/")) return { lang: "ar", path: pathname.slice(3) };
  return { lang: "en", path: pathname };
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

/** Reads the optional `[...lang]` route parameter. Anything but "ar" or nothing is a bug. */
export function langFromParam(param: string | undefined): Lang {
  if (param === undefined) return "en";
  if (param === "ar") return "ar";
  throw new Error(`Unknown language "${param}". Expected one of: ${LANGS.join(", ")}.`);
}

/** Static paths for the optional `[...lang]` segment: English (no segment) and Arabic. */
export function langPaths(): { params: { lang: string | undefined } }[] {
  return [{ params: { lang: undefined } }, { params: { lang: "ar" } }];
}
