/**
 * `add` arguments
 *
 * Parses and validates the command line of `slotsmith-ai add`.
 *
 * @packageDocumentation
 */

import { parseArgs } from "node:util";
import { LIBRARIES, type ComponentName, type Library } from "../knowledge/types";

/**
 * Components
 *
 * Every component an adapter can be added for, in the order `--all` writes them.
 */
export const COMPONENTS: readonly ComponentName[] = ["data-table", "autocomplete", "file-uploader", "date-picker"];

/**
 * Library aliases
 *
 * Other names people use for a library, mapped to the one the CLI uses.
 */
export const LIBRARY_ALIASES: Readonly<Record<string, Library>> = {
  "ant-design": "antd",
  "radix-themes": "radix",
};

/**
 * Add usage
 *
 * The help text of `slotsmith-ai add`.
 */
export const ADD_USAGE = `Usage: slotsmith-ai add <component...> --ui <library> [--out <dir>] [--force] [--dry-run]
       slotsmith-ai add --all --ui <library>

  <component>   ${COMPONENTS.join(" | ")}
  --ui          ${LIBRARIES.join(" | ")}
                (ant-design is accepted for antd, radix-themes for radix)
  --all         add every component
  --out         where to write. Default: src/components/slotsmith when src/ exists,
                else components/slotsmith
  --force       overwrite a file that differs from what would be written
  --dry-run     print what would happen, write nothing`;

/**
 * Add arguments
 *
 * A valid `add` command line.
 */
export interface AddArgs {
  /** The components to add, without duplicates. */
  components: ComponentName[];
  /** The library, with aliases resolved. */
  library: Library;
  /** The output folder as given, if any. */
  out?: string;
  /** Overwrite files that differ. */
  force: boolean;
  /** Write nothing. */
  dryRun: boolean;
}

/**
 * Parsed add arguments
 *
 * Either the arguments, a request for help, or why they are invalid.
 */
export type ParsedAddArgs = { ok: true; args: AddArgs } | { ok: true; help: true } | { ok: false; error: string };

const isComponent = (value: string): value is ComponentName => (COMPONENTS as readonly string[]).includes(value);
const isLibrary = (value: string): value is Library => (LIBRARIES as readonly string[]).includes(value);

/**
 * Parse add arguments
 *
 * @param argv - The arguments after `add`.
 * @returns The validated arguments, or an error that names the valid values.
 */
export function parseAddArgs(argv: string[]): ParsedAddArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        ui: { type: "string" },
        out: { type: "string" },
        all: { type: "boolean", default: false },
        force: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const { values, positionals } = parsed;
  if (values.help) return { ok: true, help: true };

  const validLibraries = `Valid libraries: ${LIBRARIES.join(", ")} (or ${Object.keys(LIBRARY_ALIASES).join(", ")}).`;
  const validComponents = `Valid components: ${COMPONENTS.join(", ")}, or --all.`;

  if (values.ui === undefined) return { ok: false, error: `Missing --ui. ${validLibraries}` };
  const ui = values.ui.trim().toLowerCase();
  const library = isLibrary(ui) ? ui : LIBRARY_ALIASES[ui];
  if (!library) return { ok: false, error: `Unknown library "${values.ui}". ${validLibraries}` };

  const unknown = positionals.filter((name) => !isComponent(name));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown component${unknown.length > 1 ? "s" : ""} ${unknown.map((name) => `"${name}"`).join(", ")}. ${validComponents}` };
  }
  if (values.all && positionals.length > 0) return { ok: false, error: `Name components or pass --all, not both. ${validComponents}` };
  if (!values.all && positionals.length === 0) return { ok: false, error: `No component given. ${validComponents}` };
  if (values.out !== undefined && values.out.trim() === "") return { ok: false, error: "--out needs a folder." };

  const components = values.all ? [...COMPONENTS] : [...new Set(positionals as ComponentName[])];
  return {
    ok: true,
    args: { components, library, out: values.out, force: values.force, dryRun: values["dry-run"] },
  };
}
