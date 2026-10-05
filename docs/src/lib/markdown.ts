/**
 * Markdown copies
 *
 * Every page as Markdown, for `<path>index.md` and `llms-full.txt`: the
 * title, the description as a quote, then the page's content. Prose comes
 * from the MDX with its blocks turned into what they show: a demo becomes its
 * sample's code, the install block its commands, a keyboard table a Markdown
 * table, `<CompoundParts />` a list of the parts, `<Faq />` the
 * frontmatter's questions. Generated pages (API, Adapters) are written from
 * the reference and the adapter samples. Links become absolute, so a copy
 * reads the same wherever it is pasted.
 */
import { SITE } from "../../site.config.ts";
import { COMPONENTS, componentMeta, type ComponentSlug } from "@/data/components";
import { landingFaq, type FaqItem } from "@/data/faq";
import { localePath, t, type Lang, type MessageKey } from "@/i18n";
import { ADAPTER_LIBRARIES } from "@/lib/adapters";
import { compoundParts } from "@/lib/compound-parts";
import { canonicalUrl } from "@/lib/page";
import type { PageInfo } from "@/lib/pages";
import { PACKS } from "@/lib/packs";
import { getReference, type ComponentReference } from "@/lib/reference";
import { SAMPLE_SOURCES, sampleSource } from "@/lib/samples";

const fence = (code: string, lang: string) => `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
const code = (text: string) => `\`${text}\``;
const cell = (text: string | undefined) => (text ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

/** A Markdown table; every cell is escaped and kept on one line. */
export function markdownTable(head: string[], rows: string[][]): string {
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
}

/** A path or URL as an absolute URL, read relative to the page it appears on. */
function absolute(href: string, pageUrl: string): string {
  try {
    return new URL(href, pageUrl).href;
  } catch {
    return href;
  }
}

/** The FAQ as Markdown: one `###` question per item, its answer and the page that shows it. */
export function faqMarkdown(items: FaqItem[], lang: Lang, pageUrl: string): string {
  return items
    .map((item) => {
      const link = item.link ? ` See ${absolute(item.link.startsWith("/") ? localePath(lang, item.link) : item.link, pageUrl)}` : "";
      return `### ${item.q}\n\n${item.a}${link}`;
    })
    .join("\n\n");
}

interface Block {
  name: string;
  /** Attribute values: strings as written, `{…}` expressions as their source text. */
  attrs: Record<string, string>;
  /** The children of a paired tag. */
  children?: string;
}

/** Reads the attributes of a JSX tag, keeping `{…}` expressions whole. */
function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let i = 0;
  while (i < source.length) {
    const name = /^\s*([A-Za-z_][\w-]*)/.exec(source.slice(i));
    if (!name) break;
    i += name[0].length;
    const rest = source.slice(i);
    const eq = /^\s*=\s*/.exec(rest);
    if (!eq) {
      attrs[name[1]!] = "true";
      continue;
    }
    i += eq[0].length;
    const quote = source[i];
    if (quote === '"' || quote === "'") {
      const end = source.indexOf(quote, i + 1);
      attrs[name[1]!] = source.slice(i + 1, end);
      i = end + 1;
    } else if (quote === "{") {
      const end = matchingBrace(source, i);
      attrs[name[1]!] = source.slice(i + 1, end);
      i = end + 1;
    } else break;
  }
  return attrs;
}

/** The index of the `}` closing the `{` at `open`, skipping strings. */
function matchingBrace(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return i;
  }
  return text.length - 1;
}

/** The end of the JSX opening tag starting at `start` (the index after its `>`), and whether it closes itself. */
function tagEnd(text: string, start: number): { end: number; selfClosing: boolean } {
  for (let i = start; i < text.length; i++) {
    const char = text[i]!;
    if (char === "{") i = matchingBrace(text, i);
    else if (char === '"' || char === "'") i = text.indexOf(char, i + 1);
    else if (char === ">") return { end: i + 1, selfClosing: text[i - 1] === "/" };
  }
  return { end: text.length, selfClosing: true };
}

/** The `[start, end)` ranges of the inline code spans in a Markdown text: a backtick run up to the next run of the same length. */
function codeSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  const run = /`+/g;
  for (let match = run.exec(text); match; match = run.exec(text)) {
    const ticks = match[0];
    const close = new RegExp(`(?<!\`)${ticks}(?!\`)`, "g");
    close.lastIndex = match.index + ticks.length;
    const found = close.exec(text);
    if (!found) continue; // An unmatched run is literal text.
    spans.push([match.index, found.index + ticks.length]);
    run.lastIndex = found.index + ticks.length;
  }
  return spans;
}

/**
 * Replaces every capitalised JSX block in the prose with what `render` returns
 * for it. A tag inside an inline code span is text, not a block. A paired tag
 * with no closing tag renders as if it closed itself, and the text after it
 * is kept.
 */
async function replaceBlocks(text: string, render: (block: Block) => Promise<string>): Promise<string> {
  let out = "";
  let at = 0;
  const spans = codeSpans(text);
  const open = /<([A-Z]\w*)\b/g;
  for (let match = open.exec(text); match; match = open.exec(text)) {
    const span = spans.find(([start, stop]) => match!.index >= start && match!.index < stop);
    if (span) {
      open.lastIndex = span[1];
      continue;
    }
    const name = match[1]!;
    const { end, selfClosing } = tagEnd(text, match.index + match[0].length);
    const attrs = parseAttrs(text.slice(match.index + match[0].length, selfClosing ? end - 2 : end - 1));
    let blockEnd = end;
    let children: string | undefined;
    if (!selfClosing) {
      const close = text.indexOf(`</${name}>`, end);
      if (close !== -1) {
        children = text.slice(end, close);
        blockEnd = close + name.length + 3;
      }
    }
    out += text.slice(at, match.index) + (await render({ name, attrs, children }));
    at = blockEnd;
    open.lastIndex = blockEnd;
  }
  return out + text.slice(at);
}

/** Evaluates a block's literal expression (a keyboard table's rows). Only the site's own MDX reaches this. */
function literal<T>(source: string | undefined): T | undefined {
  if (!source) return undefined;
  try {
    return new Function(`return (${source});`)() as T;
  } catch {
    return undefined;
  }
}

const FENCED = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm;

/** Applies `edit` to the text outside fenced code blocks. */
async function outsideFences(text: string, edit: (part: string) => Promise<string>): Promise<string> {
  let out = "";
  let at = 0;
  for (const match of text.matchAll(FENCED)) {
    out += (await edit(text.slice(at, match.index))) + match[0];
    at = match.index! + match[0].length;
  }
  return out + (await edit(text.slice(at)));
}

function installMarkdown(slug: ComponentSlug, lang: Lang): string {
  const reference = getReference(slug);
  const peers = reference.requiredPeers.map((peer) => peer.name).filter((name) => name !== "react" && name !== "react-dom");
  const optional = reference.virtual && reference.optionalPeers.length > 0
    ? `\n\n${t(lang, "install.optional", { component: code(reference.virtual.exportName), entry: code(reference.virtual.entry), peers: reference.optionalPeers.map((p) => code(p.name)).join(", ") })}`
    : "";
  return `${fence(`npm i ${["slotsmith", ...peers].join(" ")}`, "bash")}${optional}\n\n${fence(`import "${reference.css}";`, "ts")}\n\n${t(lang, "install.css", { all: code("slotsmith/styles.css") })}`;
}

async function guideListMarkdown(slug: ComponentSlug, lang: Lang, contentLang: Lang): Promise<string> {
  const { allPages } = await import("@/lib/pages");
  const pages = await allPages();
  return componentMeta(slug)
    .guides.map((guide) => {
      const path = `/components/${slug}/guides/${guide.slug}/`;
      const page = pages.find((p) => p.lang === contentLang && p.path === path);
      const title = t(contentLang, guide.title);
      return `- [${title}](${canonicalUrl(lang, path)}): ${page?.description ?? ""}`.trimEnd().replace(/:$/, "");
    })
    .join("\n");
}

function referenceLinksMarkdown(slug: ComponentSlug, lang: Lang, contentLang: Lang): string {
  const base = `/components/${slug}/`;
  const links: [string, MessageKey, MessageKey][] = [
    [`${base}api/#slots`, "api.slots", "overview.refSlots"],
    [`${base}api/#props`, "api.props", "overview.refProps"],
    [`${base}api/#labels`, "api.labels", "overview.refLabels"],
    [`${base}api/#styling`, "api.styling", "overview.refStyling"],
    [`${base}adapters/`, "component.adapters", "overview.refAdapters"],
  ];
  return links.map(([href, title, lead]) => `- [${t(contentLang, title)}](${SITE.url}${localePath(lang, href)}): ${t(contentLang, lead)}`).join("\n");
}

/** The MDX body of a prose page as Markdown. */
async function proseMarkdown(page: PageInfo): Promise<string> {
  const prose = page.prose!;
  const contentLang: Lang = prose.translated ? page.lang : "en";
  const pageUrl = canonicalUrl(page.lang, page.path);
  const faq = (prose.entry.data as { faq?: FaqItem[] }).faq ?? [];
  const body = (prose.entry.body ?? "").replace(/^---\n[\s\S]*?\n---\n/, "");

  const render = async ({ name, attrs, children }: Block): Promise<string> => {
    switch (name) {
      case "Demo":
      case "SampleCode": {
        const sample = attrs.name && SAMPLE_SOURCES[attrs.name];
        return sample ? fence(sample.code, sample.lang) : "";
      }
      case "QuickStart": {
        const slug = attrs.slug ?? page.component;
        return slug ? fence(sampleSource(`${slug}/quick-start`).code, "tsx") : "";
      }
      case "Install":
        return page.component ? installMarkdown(page.component, contentLang) : "";
      case "GuideList":
        return page.component ? guideListMarkdown(page.component, page.lang, contentLang) : "";
      case "Reference":
        return page.component ? referenceLinksMarkdown(page.component, page.lang, contentLang) : "";
      case "CompoundParts": {
        const slug = (attrs.slug as ComponentSlug | undefined) ?? page.component;
        return slug
          ? compoundParts(slug)
              .map((part) => `- ${code(part.member)}${part.named === part.member.replace(".", "") ? "" : ` (${code(part.named)})`}`)
              .join("\n")
          : "";
      }
      case "KeyboardTable": {
        const rows = literal<{ keys: string[]; action: string }[]>(attrs.rows) ?? [];
        return markdownTable([t(contentLang, "overview.keys"), t(contentLang, "overview.action")], rows.map((row) => [row.keys.join(", "), row.action]));
      }
      case "Faq":
        return faqMarkdown(faq, page.lang, pageUrl);
      case "PackTable":
        return markdownTable(
          [t(contentLang, "packs.language"), t(contentLang, "packs.import"), t(contentLang, "packs.export"), t(contentLang, "packs.direction")],
          PACKS.map((pack) => [pack.name, code(pack.importPath), code(pack.exportName), pack.dir]),
        );
      case "Tabs": {
        // Each tab that shows a sample, as its own fenced block.
        const tabs = literal<{ label: string; sample?: string }[]>(attrs.tabs) ?? [];
        return tabs
          .flatMap((tab) => (tab.sample && SAMPLE_SOURCES[tab.sample] ? [SAMPLE_SOURCES[tab.sample]!] : []))
          .map((sample) => fence(sample.code, sample.lang))
          .join("\n\n");
      }
      default:
        // A wrapper (a note) keeps its text; anything else shows nothing a copy can use.
        return children ? (await replaceBlocks(children, render)).trim() : "";
    }
  };

  const text = await outsideFences(body, async (part) => {
    const cleaned = part.replace(/^import\s[^\n]*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const replaced = await replaceBlocks(cleaned, render);
    // Links made absolute: `](./x/)`, `](/x/)` and `](#id)`.
    return replaced.replace(/\]\(((?:\.{1,2}\/|\/|#)[^)\s]*)\)/g, (_whole, href: string) => `](${absolute(href, pageUrl)})`);
  });
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function apiMarkdown(slug: ComponentSlug, lang: Lang): string {
  const reference: ComponentReference = getReference(slug);
  const component = code(reference.exportName);
  return [
    `## ${t(lang, "api.slots")}`,
    t(lang, "api.slotsLead", { component, count: reference.slots.length, prop: code("components") }),
    markdownTable(
      ["Slot", "Kind", "Props type", "Description"],
      reference.slots.map((slot) => [code(slot.name), slot.kind, code(slot.propsType), slot.summary || slot.title]),
    ),
    `## ${t(lang, "api.props")}`,
    t(lang, "api.propsLead", { component }),
    markdownTable(
      ["Prop", "Type", "Default", "Description"],
      reference.props.map((prop) => [code(prop.name), code(prop.type), prop.default ? code(prop.default) : "", prop.description]),
    ),
    `## ${t(lang, "api.labels")}`,
    t(lang, "api.labelsLead", { component, labels: code("labels"), locale: code("locale") }),
    markdownTable(
      ["Label", "Type", "Default", "Description"],
      reference.labels.map((label) => [code(label.name), code(label.type), label.default ? code(label.default) : "", label.description]),
    ),
    ...(reference.validationLabels?.length
      ? [
          `### ${t(lang, "api.validationLabels")}`,
          t(lang, "api.validationLabelsLead", { validationLabels: code("validationLabels"), locale: code("locale") }),
          markdownTable(
            ["Label", "Type", "Default", "Description"],
            reference.validationLabels.map((label) => [code(label.name), code(label.type), label.default ? code(label.default) : "", label.description]),
          ),
        ]
      : []),
    `## ${t(lang, "api.styling")}`,
    t(lang, "api.stylingLead", { component }),
    `Classes: ${reference.classes.map(code).join(", ")}`,
    `Tokens: ${reference.tokens.map(code).join(", ")}`,
  ].join("\n\n");
}

function adaptersMarkdown(slug: ComponentSlug, lang: Lang): string {
  const { exportName } = getReference(slug);
  return ADAPTER_LIBRARIES.filter((library) => `adapters/${slug}/${library.id}` in SAMPLE_SOURCES)
    .map((library) => {
      const source = SAMPLE_SOURCES[`adapters/${slug}/${library.id}`]!;
      const lead = t(lang, "adapters.lead", { component: code(exportName), library: library.name, prop: code("components") });
      return `## ${library.name}\n\n${lead}\n\n${fence(source.code, source.lang)}`;
    })
    .join("\n\n");
}

function landingMarkdown(lang: Lang): string {
  const components = COMPONENTS.map(
    (meta) => `- [${t(lang, meta.title)}](${canonicalUrl(lang, `/components/${meta.slug}/`)}): ${t(lang, meta.summary)}`,
  ).join("\n");
  const start = `${t(lang, "hero.getStarted")}: ${canonicalUrl(lang, "/getting-started/")}`;
  return `${fence("npm i slotsmith", "bash")}\n\n${start}\n\n${components}\n\n## ${t(lang, "faq.title")}\n\n${faqMarkdown(landingFaq(lang), lang, canonicalUrl(lang, "/"))}`;
}

/**
 * One page as Markdown: `# <title>`, the description as a quote, then the
 * content. A stub with no prose says it is being written.
 */
export async function pageMarkdown(page: PageInfo): Promise<string> {
  let content: string;
  if (page.kind === "landing") content = landingMarkdown(page.lang);
  else if (page.kind === "api" && page.component) content = apiMarkdown(page.component, page.lang);
  else if (page.kind === "adapters" && page.component && !page.stub) content = adaptersMarkdown(page.component, page.lang);
  else if (page.prose) content = await proseMarkdown(page);
  else content = t(page.lang, "common.stub");
  return `# ${page.title}\n\n> ${page.description}\n\n${content}\n`;
}
