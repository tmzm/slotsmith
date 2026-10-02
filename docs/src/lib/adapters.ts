/**
 * Adapters
 *
 * What an adapter sample needs besides slotsmith and React, read from its
 * imports, so the Adapters page names the packages from the code it shows.
 */

/** The design systems the Adapters pages cover, in page order. */
export const ADAPTER_LIBRARIES = [
  { id: "shadcn", name: "shadcn/ui" },
  { id: "mui", name: "MUI" },
  { id: "chakra", name: "Chakra UI" },
  { id: "antd", name: "Ant Design" },
  { id: "radix", name: "Radix Themes" },
] as const;

export type AdapterLibrary = (typeof ADAPTER_LIBRARIES)[number]["id"];

/** What one adapter imports. */
export interface AdapterNeeds {
  /** npm packages, e.g. `@mui/material`, sorted. */
  packages: string[];
  /** shadcn/ui components, from `@/components/ui/<name>`, sorted. */
  shadcn: string[];
}

/** `@scope/name/deep` → `@scope/name`; `name/deep` → `name`. */
const packageName = (specifier: string) => specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");

/**
 * The packages and shadcn/ui components an adapter imports. React, slotsmith,
 * relative files and the app's own `@/lib` helpers are left out.
 *
 * @param code - The adapter's source.
 */
export function adapterNeeds(code: string): AdapterNeeds {
  const specifiers = [...code.matchAll(/(?:^|\n)\s*(?:import|\})[^"'\n]*?from\s+["']([^"']+)["']/g)].map((m) => m[1]!);
  const packages = new Set<string>();
  const shadcn = new Set<string>();
  for (const specifier of specifiers) {
    const ui = /^@\/components\/ui\/([\w-]+)$/.exec(specifier);
    if (ui) shadcn.add(ui[1]!);
    else if (specifier.startsWith(".") || specifier.startsWith("@/")) continue;
    else {
      const name = packageName(specifier);
      if (name !== "react" && name !== "react-dom" && name !== "slotsmith") packages.add(name);
    }
  }
  return { packages: [...packages].sort(), shadcn: [...shadcn].sort() };
}
