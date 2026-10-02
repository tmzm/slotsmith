/**
 * `/llms-full.txt`: every finished English page as Markdown, the same text as
 * its `<path>index.md` copy, then the generated reference (slots, props,
 * labels) of each component whose API page is not finished yet.
 */
import type { APIRoute } from "astro";
import { COMPONENTS } from "@/data/components";
import { markdownTable, pageMarkdown } from "@/lib/markdown";
import { canonicalUrl } from "@/lib/page";
import { publishedPages } from "@/lib/pages";
import { getReference, type ComponentReference } from "@/lib/reference";
import { renderLlmsFull } from "@/lib/seo-files";

const code = (text: string) => `\`${text}\``;

function referenceMarkdown(reference: ComponentReference): string {
  return [
    `# ${reference.title} reference`,
    `> ${reference.summary}`,
    `Entry: ${code(reference.entry)}. Stylesheet: ${code(reference.css)}.`,
    "## Slots",
    markdownTable(["Slot", "Kind", "Props type", "Description"], reference.slots.map((s) => [s.name, s.kind, code(s.propsType), s.summary || s.title])),
    "## Props",
    markdownTable(["Prop", "Type", "Default", "Description"], reference.props.map((p) => [p.name, code(p.type), p.default ?? "", p.description])),
    "## Labels",
    markdownTable(["Label", "Type", "Default", "Description"], reference.labels.map((l) => [l.name, code(l.type), l.default ?? "", l.description])),
  ].join("\n\n");
}

export const GET: APIRoute = async () => {
  const pages = (await publishedPages()).filter((page) => page.lang === "en");
  const documents = await Promise.all(
    pages.map(async (page) => ({ title: page.title, url: canonicalUrl("en", page.path), markdown: (await pageMarkdown(page)).trim() })),
  );
  const references = COMPONENTS.filter((meta) => !pages.some((page) => page.path === `/components/${meta.slug}/api/`)).map((meta) => {
    const reference = getReference(meta.slug);
    return { title: `${reference.title} reference`, url: canonicalUrl("en", `/components/${meta.slug}/api/`), markdown: referenceMarkdown(reference) };
  });
  return new Response(renderLlmsFull([...documents, ...references]), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
