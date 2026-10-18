/**
 * shadcn registry
 *
 * Builds the shadcn/ui registry into `public/r/`, so the site serves it:
 * `https://slotsmith.dev/r/<component>.json` for each component and
 * `https://slotsmith.dev/r/registry.json` for the index. A project that
 * names the registry in its `components.json` installs an adapter with
 * `npx shadcn@latest add @slotsmith/<component>`.
 *
 * The items are the ones `slotsmith-ai`'s own build writes, made from the
 * knowledge generated in memory here, so the served registry always matches
 * the adapters of the library this site documents.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_OPTIONS, generateKnowledge } from "../../packages/ai/scripts/generate.ts";
import { buildRegistryIndex, buildRegistryItems, DEFAULT_REGISTRY_OPTIONS } from "../../packages/ai/scripts/registry.ts";

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "r");

const { index, adapters } = generateKnowledge(DEFAULT_OPTIONS);
const items = buildRegistryItems(index, adapters);
const registry = buildRegistryIndex(items, { name: DEFAULT_REGISTRY_OPTIONS.registryName, homepage: DEFAULT_REGISTRY_OPTIONS.homepage });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const item of items) writeFileSync(join(outDir, `${item.name.replace(/^slotsmith-/, "")}.json`), `${JSON.stringify(item, null, 2)}\n`);
writeFileSync(join(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);

process.stdout.write(`registry: ${items.length} items in public/r\n`);
