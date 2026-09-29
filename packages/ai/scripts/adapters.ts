/**
 * Adapter generation
 *
 * The adapters an app copies in are the integration skins the library tests
 * against, with the imports pointed at what an app has. Nothing under
 * `knowledge/adapters/` is written by hand.
 *
 * @packageDocumentation
 */

/**
 * shadcn/ui components
 *
 * The names in shadcn/ui's registry. A skin may only import these from
 * `./ui/`, because an app gets them with `npx shadcn@latest add <name>`; a
 * helper that only the repository has would leave the adapter broken.
 */
export const SHADCN_UI = new Set([
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "breadcrumb", "button", "button-group",
  "calendar", "card", "carousel", "chart", "checkbox", "collapsible", "combobox", "command", "context-menu", "dialog",
  "drawer", "dropdown-menu", "empty", "field", "form", "hover-card", "input", "input-group", "input-otp", "item",
  "kbd", "label", "menubar", "native-select", "navigation-menu", "pagination", "popover", "progress", "radio-group",
  "resizable", "scroll-area", "select", "separator", "sheet", "sidebar", "skeleton", "slider", "sonner", "spinner",
  "switch", "table", "tabs", "textarea", "toggle", "toggle-group", "tooltip",
]);

/**
 * Adapter source
 *
 * Turns a tested integration skin into the adapter an app copies in. The only
 * differences are the import paths: inside the repository a skin imports the
 * component's entry (`../../../index`) and its test-local shadcn/ui copies
 * (`./ui/*`); an app imports the published entry point and its own
 * components. Any other relative import, side-effect imports included, is
 * something only the repository has, so it throws, and the skin is fixed
 * instead.
 *
 * @param source - The skin's source text.
 * @param component - The component's folder name, e.g. `date-picker`.
 * @returns The adapter's source text.
 * @throws When the skin imports a file an app would not have.
 */
export function toAdapterSource(source: string, component: string): string {
  const adapter = source
    .replace(/from "\.\.\/\.\.\/\.\.\/index"/g, `from "slotsmith/${component}"`)
    .replace(/from "\.\/ui\/utils"/g, 'from "@/lib/utils"')
    .replace(/from "\.\/ui\/([\w-]+)"/g, (_, name: string) => {
      if (!SHADCN_UI.has(name)) throw new Error(`${component}: "./ui/${name}" is not a shadcn/ui component; inline it in the skin`);
      return `from "@/components/ui/${name}"`;
    });
  const relative = /(?:\bfrom|^\s*import)\s+"(\.\.?\/[^"]*)"/m.exec(adapter);
  if (relative) throw new Error(`${component}: the skin imports "${relative[1]}", which an app does not have; inline it in the skin`);
  return adapter;
}

/**
 * Adapter peers
 *
 * Side-effect imports (`import "@radix-ui/themes/styles.css"`) count too.
 *
 * @param source - The adapter's source text.
 * @returns The packages it imports, other than React, slotsmith and the app's own aliases, sorted.
 */
export function peersOf(source: string): string[] {
  const packages = [...source.matchAll(/(?:\bfrom|^\s*import)\s+"([^"./@][^"]*|@[^"/]+\/[^"/]+)/gm)].map(([, name]) => {
    const parts = name!.split("/");
    return name!.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
  });
  return [...new Set(packages)].filter((name) => !["react", "react-dom", "slotsmith"].includes(name)).sort();
}
