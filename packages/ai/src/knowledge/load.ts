import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AdapterRef, ComponentKnowledge, KnowledgeIndex } from "./types";

/**
 * Knowledge
 *
 * Everything the server answers from, read once at start-up.
 */
export interface Knowledge {
  /** The table of contents. */
  index: KnowledgeIndex;
  /** Every component, by name. */
  components: Map<string, ComponentKnowledge>;
  /** Every guide's Markdown, by name. */
  guides: Map<string, string>;
  /** Every adapter's source, by file name. */
  adapters: Map<string, string>;
}

/**
 * Find knowledge directory
 *
 * Walks up from a module to the nearest `knowledge/index.json`. The bundled
 * CLI sits in `dist/` and the sources in `src/…`, so the same lookup serves
 * the published package, the tests and a local build.
 *
 * @param from - The module URL to start from.
 * @returns The absolute path of the `knowledge` folder.
 * @throws When no generated knowledge is found; run `pnpm generate` first.
 */
export function findKnowledgeDir(from: string = import.meta.url): string {
  let dir = dirname(fileURLToPath(from));
  for (;;) {
    const candidate = join(dir, "knowledge");
    if (existsSync(join(candidate, "index.json"))) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("slotsmith-ai: generated knowledge not found. Run `pnpm generate` in packages/ai.");
}

/**
 * Load knowledge
 *
 * Reads the index, every component, every guide and every adapter.
 *
 * @param dir - The `knowledge` folder.
 * @returns The knowledge, in memory.
 */
export function loadKnowledge(dir: string = findKnowledgeDir()): Knowledge {
  // Line endings are normalised, since a checkout on Windows may have converted them.
  const read = (...parts: string[]) => readFileSync(join(dir, ...parts), "utf8").replace(/\r\n/g, "\n");
  const index = JSON.parse(read("index.json")) as KnowledgeIndex;

  const components = new Map<string, ComponentKnowledge>();
  for (const summary of index.components) {
    components.set(summary.name, JSON.parse(read("components", `${summary.name}.json`)) as ComponentKnowledge);
  }

  const guides = new Map<string, string>();
  for (const guide of index.guides) guides.set(guide.name, read("guides", `${guide.name}.md`));

  const adapters = new Map<string, string>();
  for (const adapter of index.adapters) adapters.set(adapter.file, read("adapters", adapter.file));

  return { index, components, guides, adapters };
}

/**
 * Adapters for
 *
 * @param knowledge - The knowledge.
 * @param component - A component name.
 * @returns The adapters written for that component.
 */
export const adaptersFor = (knowledge: Knowledge, component: string): AdapterRef[] =>
  knowledge.index.adapters.filter((adapter) => adapter.component === component);
