import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_OPTIONS, generateKnowledge } from "../../packages/ai/scripts/generate.ts";
import type { ComponentReference } from "../src/lib/reference.ts";
import attributes from "../src/data/data-attributes.json" with { type: "json" };
import { extractTokens } from "./lib/tokens.ts";

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(docsRoot, "src/generated/reference");
const extra = attributes as Record<string, Record<string, string[]>>;

/**
 * Builds the reference for every component: the generator's record, the tokens
 * its stylesheet uses, and each slot's data attributes merged with the extras
 * kept in `src/data/data-attributes.json`.
 */
export function buildReference(): ComponentReference[] {
  const { components } = generateKnowledge(DEFAULT_OPTIONS);
  return components.map((component) => {
    const css = readFileSync(resolve(DEFAULT_OPTIONS.libraryRoot, "src", component.name, "styles.css"), "utf8");
    return {
      ...component,
      tokens: extractTokens(css),
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
