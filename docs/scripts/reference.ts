import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_OPTIONS, generateKnowledge } from "../../packages/ai/scripts/generate.ts";
import type { ComponentReference } from "../src/lib/reference.ts";
import attributes from "../src/data/data-attributes.json" with { type: "json" };
import { extractTokens, ownTokens, TOKEN_PREFIX } from "./lib/tokens.ts";
import { readValidationLabels } from "./lib/validation-labels.ts";
import { classes as autocompleteClasses } from "../../src/autocomplete/classes.ts";
import { classes as dataTableClasses } from "../../src/data-table/classes.ts";
import { classes as datePickerClasses } from "../../src/date-picker/classes.ts";
import { classes as fileUploaderClasses } from "../../src/file-uploader/classes.ts";

/** Each component's class map, as the library declares it. */
const CLASSES: Record<string, Record<string, string>> = {
  autocomplete: autocompleteClasses,
  "data-table": dataTableClasses,
  "date-picker": datePickerClasses,
  "file-uploader": fileUploaderClasses,
};

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(docsRoot, "src/generated/reference");

/**
 * Builds the reference for every component: the generator's record, the tokens
 * its stylesheet uses, the class names its markup uses (its `classes.ts`, in
 * declaration order), and each slot's data attributes merged with the extras
 * kept in `src/data/data-attributes.json` (or the `extra` given, for tests).
 * The file uploader also gets its validation messages, a second labels
 * section (`validationLabels`, defaults in `defaultValidationLabels`) that
 * the generator does not read.
 */
export function buildReference(extra: Record<string, Record<string, string[]>> = attributes): ComponentReference[] {
  const { components } = generateKnowledge(DEFAULT_OPTIONS);
  return components.map((component) => {
    const css = readFileSync(resolve(DEFAULT_OPTIONS.libraryRoot, "src", component.name, "styles.css"), "utf8");
    const validation =
      component.name === "file-uploader"
        ? {
            validationLabels: readValidationLabels(resolve(DEFAULT_OPTIONS.libraryRoot, "src/file-uploader/core/validate.ts")),
            validationLabelsExport: "defaultValidationLabels",
          }
        : {};
    return {
      ...component,
      ...validation,
      classes: [...new Set(Object.values(CLASSES[component.name] ?? {}))],
      tokens: ownTokens(extractTokens(css), TOKEN_PREFIX[component.name as keyof typeof TOKEN_PREFIX]),
      slots: component.slots.map((slot) => ({
        ...slot,
        dataAttributes: [...new Set([...slot.dataAttributes, ...(extra[component.name]?.[slot.name] ?? [])])].sort(),
      })),
    };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const references = buildReference();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const reference of references) {
    writeFileSync(resolve(outDir, `${reference.name}.json`), `${JSON.stringify(reference, null, 2)}\n`);
  }
  console.log(`reference: ${references.map((r) => `${r.name} (${r.slots.length} slots)`).join(", ")}`);
}
