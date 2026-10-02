/**
 * `/llms-full.txt`: every finished English page as Markdown, then each
 * component's generated reference (slots, props, labels) as Markdown tables.
 */
import type { APIRoute } from "astro";
import { COMPONENTS } from "@/data/components";
import { canonicalUrl } from "@/lib/page";
import { publishedPages } from "@/lib/pages";
import { getReference, type ComponentReference } from "@/lib/reference";
import { renderLlmsFull } from "@/lib/seo-files";

/** The MDX body as plain Markdown: imports, comments and components dropped, a component's children kept. */
function proseMarkdown(body: string): string {
  return body
    .replace(/^import\s.+$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<([A-Z]\w*)\b[^>]*?\/>/gs, "")
    .replace(/<\/?[A-Z]\w*\b[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const cell = (text: string | undefined) => (text ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const table = (head: string[], rows: string[][]) =>
  [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");

function referenceMarkdown(reference: ComponentReference): string {
  return [
    `# ${reference.title} reference`,
    `> ${reference.summary}`,
    `Entry: \`${reference.entry}\`. Stylesheet: \`${reference.css}\`.`,
    "## Slots",
    table(["Slot", "Kind", "Props type", "Description"], reference.slots.map((s) => [s.name, s.kind, `\`${s.propsType}\``, s.summary || s.title])),
    "## Props",
    table(["Prop", "Type", "Default", "Description"], reference.props.map((p) => [p.name, `\`${p.type}\``, p.default ?? "", p.description])),
    "## Labels",
    table(["Label", "Type", "Default", "Description"], reference.labels.map((l) => [l.name, `\`${l.type}\``, l.default ?? "", l.description])),
  ].join("\n\n");
}

export const GET: APIRoute = async () => {
  const pages = (await publishedPages()).filter((page) => page.lang === "en");
  const prose = pages
    .filter((page) => page.prose)
    .map((page) => ({
      title: page.title,
      url: canonicalUrl("en", page.path),
      markdown: `# ${page.title}\n\n> ${page.description}\n\n${proseMarkdown(page.prose!.entry.body ?? "")}`,
    }));
  const references = COMPONENTS.map((meta) => {
    const reference = getReference(meta.slug);
    return { title: `${reference.title} reference`, url: canonicalUrl("en", `/components/${meta.slug}/api/`), markdown: referenceMarkdown(reference) };
  });
  return new Response(renderLlmsFull([...prose, ...references]), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
