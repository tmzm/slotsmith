import type { Knowledge } from "./load";

/**
 * Search entry
 *
 * One addressable piece of knowledge: a prop, a slot, a label, a guide
 * section or an adapter.
 */
export interface SearchEntry {
  /** Where it lives, e.g. `slotsmith://components/date-picker#slot-Day`. */
  anchor: string;
  /** A short heading. */
  title: string;
  /** What kind of thing it is. */
  kind: "component" | "prop" | "slot" | "label" | "guide" | "adapter";
  /** The component it belongs to, when it belongs to one. */
  component?: string;
  /** The searchable text. */
  text: string;
}

/**
 * Search result
 */
export interface SearchResult {
  /** Where it lives. */
  anchor: string;
  /** A short heading. */
  title: string;
  /** What kind of thing it is. */
  kind: SearchEntry["kind"];
  /** The component it belongs to, when it belongs to one. */
  component?: string;
  /** How well it matched; higher is better. */
  score: number;
  /** The text around the first match. */
  snippet: string;
}

/**
 * Slug
 *
 * @param text - A heading.
 * @returns A URL fragment for it.
 */
export const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Terms
 *
 * Splits a query into lowercase words, also splitting camelCase, so
 * `onChange` finds "on change" and the reverse.
 *
 * @param text - A query.
 * @returns The distinct terms, two characters or longer.
 */
const terms = (text: string): string[] => {
  const words = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);
  return [...new Set(words)];
};

/**
 * Build search index
 *
 * Flattens the knowledge into entries a query can rank.
 *
 * @param knowledge - The knowledge.
 * @returns One entry per addressable piece.
 */
export function buildSearchIndex(knowledge: Knowledge): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const component of knowledge.components.values()) {
    const base = `slotsmith://components/${component.name}`;
    entries.push({
      anchor: base,
      title: `${component.title} (${component.exportName})`,
      kind: "component",
      component: component.name,
      text: `${component.name} ${component.exportName} ${component.description}`,
    });
    for (const prop of component.props) {
      entries.push({
        anchor: `${base}#prop-${prop.name}`,
        title: `${component.exportName} prop \`${prop.name}\`${prop.mode ? ` (${prop.mode})` : ""}`,
        kind: "prop",
        component: component.name,
        text: `${prop.name} ${prop.type} ${prop.group} ${prop.description}`,
      });
    }
    for (const slot of component.slots) {
      entries.push({
        anchor: `${base}#slot-${slot.name}`,
        title: `${component.exportName} slot \`${slot.name}\` (${slot.kind})`,
        kind: "slot",
        component: component.name,
        text: `${slot.name} ${slot.propsType} ${slot.kind} ${slot.title} ${slot.summary} ${slot.props.map((prop) => `${prop.name} ${prop.description}`).join(" ")}`,
      });
    }
    for (const label of component.labels) {
      entries.push({
        anchor: `${base}#label-${label.name}`,
        title: `${component.exportName} label \`${label.name}\``,
        kind: "label",
        component: component.name,
        text: `${label.name} labels ${label.description} ${label.default ?? ""}`,
      });
    }
  }

  for (const [name, markdown] of knowledge.guides) {
    const sections = markdown.split(/^(?=## )/m);
    for (const section of sections) {
      const heading = /^#{1,2}\s+(.+)$/m.exec(section)?.[1]?.trim() ?? name;
      const isIntro = !section.startsWith("## ");
      entries.push({
        anchor: `slotsmith://guides/${name}${isIntro ? "" : `#${slug(heading)}`}`,
        title: isIntro ? heading : `${knowledge.index.guides.find((guide) => guide.name === name)?.title ?? name}: ${heading}`,
        kind: "guide",
        component: knowledge.components.has(name) ? name : undefined,
        text: section,
      });
    }
  }

  for (const adapter of knowledge.index.adapters) {
    // Only the file's description is indexed: the code itself would match
    // every query about state attributes and drown out the reference.
    const source = knowledge.adapters.get(adapter.file) ?? "";
    const header = /^\/\*\*[\s\S]*?\*\//.exec(source)?.[0] ?? "";
    entries.push({
      anchor: `get_adapter_example?component=${adapter.component}&library=${adapter.library}`,
      title: `${adapter.component} adapter for ${adapter.library}`,
      kind: "adapter",
      component: adapter.component,
      text: `${adapter.component} ${adapter.library} adapter components map ${header.replace(/^\s*\/?\*+\/?/gm, "")}`,
    });
  }

  return entries;
}

/**
 * Snippet
 *
 * @param text - The entry's text.
 * @param queryTerms - The query's terms.
 * @returns Roughly 200 characters around the first term found.
 */
function snippet(text: string, queryTerms: string[]): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const at = Math.max(0, Math.min(...queryTerms.map((term) => lower.indexOf(term)).filter((index) => index >= 0)));
  const start = Math.max(0, at - 60);
  const end = Math.min(flat.length, start + 220);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

/**
 * Search
 *
 * Ranks entries by how many query terms they contain and where: a term in the
 * title counts more than one in the body, and an entry holding every term
 * counts more than one holding some.
 *
 * @param entries - From {@link buildSearchIndex}.
 * @param query - Free text.
 * @param limit - The most results to return.
 * @returns The best matches, best first.
 */
export function search(entries: SearchEntry[], query: string, limit = 8): SearchResult[] {
  const queryTerms = terms(query);
  if (queryTerms.length === 0) return [];
  const phrase = query.trim().toLowerCase();

  const scored = entries.map((entry) => {
    const title = entry.title.toLowerCase();
    const titleTerms = terms(entry.title);
    const body = entry.text.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const term of queryTerms) {
      const inTitle = titleTerms.includes(term) ? 6 : title.includes(term) ? 3 : 0;
      const occurrences = body.split(term).length - 1;
      if (inTitle > 0 || occurrences > 0) matched += 1;
      score += inTitle + Math.min(occurrences, 5);
    }
    if (matched === queryTerms.length) score *= 1.5;
    if (phrase.length > 2 && (title.includes(phrase) || body.includes(phrase))) score += 5;
    return { entry, score, matched };
  });

  return scored
    .filter(({ matched }) => matched > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, score }) => ({
      anchor: entry.anchor,
      title: entry.title,
      kind: entry.kind,
      component: entry.component,
      score: Math.round(score * 10) / 10,
      snippet: snippet(entry.text, queryTerms),
    }));
}
