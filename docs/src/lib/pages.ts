/**
 * Pages
 *
 * Every page the site builds, in both languages, with the title and
 * description its head shows and whether it is still a stub. The sitemap,
 * `llms.txt`, `llms-full.txt` and the Markdown copies are all made from this
 * one list, so none of them can name a page the site does not have.
 *
 * The rules mirror the page templates: prose wins over the catalog's
 * fallback, a page whose prose is missing or `draft` is a stub, the API page
 * is a stub until its `<slug>/labels` sample exists and the Adapters page
 * until it has an adapter sample. `verify-site` compares the sitemap with the
 * built pages, so a template that drifts from these rules fails the build.
 */
import type { CollectionEntry } from "astro:content";
import { COMPONENTS, type ComponentMeta, type ComponentSlug } from "@/data/components";
import { LANGS, t, type Lang } from "@/i18n";
import { ADAPTER_LIBRARIES } from "@/lib/adapters";
import { latestVersion, parseChangelog } from "@/lib/changelog";
import { findProse, type Prose } from "@/lib/prose";
import { SAMPLE_SOURCES } from "@/lib/samples";
import { SITE } from "../../site.config.ts";
import readme from "../../../README.md?raw";

type DocsEntry = CollectionEntry<"docs">;

export type PageKind = "landing" | "doc" | "component" | "guide" | "api" | "adapters";

/** One built page. */
export interface PageInfo {
  /** Language-neutral path with trailing slash (`/theming/`). */
  path: string;
  lang: Lang;
  /** The page's own title, without the site name. The landing's is the site name. */
  title: string;
  description: string;
  kind: PageKind;
  /** True while the page is a placeholder (`data-stub` on `<main>`). */
  stub: boolean;
  /** The component a component page belongs to. */
  component?: ComponentSlug;
  /** The prose behind the page, when it has any. */
  prose?: Prose;
  /**
   * The files the page is made from, from the repository root: its MDX, or
   * its template while it has none; the API and Adapters pages add the
   * component's source folder. Its last-updated date is the newest commit
   * touching any of them.
   */
  sources: string[];
}

const TEMPLATES = "docs/src/pages/[...lang]";
const mdxSource = (prose: Prose) => `${SITE.docsDir}/${prose.sourcePath}`;

/** The top-level docs pages, each `src/content/docs/en/<slug>.mdx`. */
export const DOC_SLUGS = [
  "getting-started",
  "guides",
  "theming",
  "languages",
  "ai-tools",
  "trust",
  "roadmap",
  "comparison",
  "changelog",
  "about",
] as const;

/** Files besides its MDX that a top-level page is built from, as repo paths: the changelog's notes are the README's. */
const DATA_SOURCES: Record<string, string[]> = {
  changelog: ["README.md"],
  comparison: ["docs/src/data/comparison.ts"],
  roadmap: ["docs/src/data/roadmap.ts"],
};

/** The top-level pages with a template of their own (`changelog/index.astro`, `roadmap/index.astro`) instead of the shared `[doc]` one. */
export const OWN_TEMPLATE_DOCS: readonly string[] = ["changelog", "roadmap"];

const LATEST_VERSION = latestVersion(parseChangelog(readme));

/**
 * A top-level page's description as its head shows it. The changelog's is
 * written with `{version}`, filled with the latest release the README names.
 */
export function docDescription(slug: string, description: string): string {
  if (slug !== "changelog" || !description.includes("{version}")) return description;
  if (!LATEST_VERSION) throw new Error("The changelog's description names the latest version, but the README's changelog has no released version.");
  return description.replace("{version}", LATEST_VERSION);
}

/** A component page: overview, API, Adapters or one guide. */
export type ComponentSection = "index" | "api" | "adapters" | `guides/${string}`;

/**
 * The catalog title, description, path and prose slug of a component page,
 * before any prose overrides them. `ComponentPage.astro` renders from this.
 *
 * @param override - True when the title is fixed by the template (API, Adapters, guides) rather than taken from prose.
 */
export function componentPageMeta(
  lang: Lang,
  meta: ComponentMeta,
  section: ComponentSection,
): { title: string; description: string; path: string; proseSlug: string; override: boolean; kind: PageKind } {
  const name = t(lang, meta.title);
  const base = `/components/${meta.slug}/`;
  if (section === "api" || section === "adapters") {
    const label = t(lang, section === "api" ? "component.api" : "component.adapters");
    return {
      title: `${name} ${label}`,
      description: t(lang, section === "api" ? "component.apiDescription" : "component.adaptersDescription", { component: name }),
      path: `${base}${section}/`,
      proseSlug: `components/${meta.slug}/${section}`,
      override: true,
      kind: section,
    };
  }
  if (section.startsWith("guides/")) {
    const slug = section.slice("guides/".length);
    const guide = meta.guides.find((g) => g.slug === slug);
    if (!guide) throw new Error(`Unknown guide "${slug}" for ${meta.slug}.`);
    const guideName = t(lang, guide.title);
    return {
      title: t(lang, "component.guideTitle", { component: name, guide: guideName }),
      description: t(lang, "component.guideDescription", { component: name, guide: guideName }),
      path: `${base}${section}/`,
      proseSlug: `components/${meta.slug}/${section}`,
      override: true,
      kind: "guide",
    };
  }
  return { title: name, description: t(lang, meta.summary), path: base, proseSlug: `components/${meta.slug}`, override: false, kind: "component" };
}

/** Whether the generated API page is complete: its labels section needs the `<slug>/labels` sample. */
export function hasApiSample(slug: ComponentSlug): boolean {
  return `${slug}/labels` in SAMPLE_SOURCES;
}

/** Whether the Adapters page has at least one adapter to show. */
export function hasAdapterSamples(slug: ComponentSlug): boolean {
  return ADAPTER_LIBRARIES.some((library) => `adapters/${slug}/${library.id}` in SAMPLE_SOURCES);
}

function componentPage(lang: Lang, meta: ComponentMeta, section: ComponentSection, lookup: (id: string) => DocsEntry | undefined): PageInfo {
  const base = componentPageMeta(lang, meta, section);
  const prose = findProse(lang, base.proseSlug, lookup);
  const generatedComplete = section === "api" ? hasApiSample(meta.slug) : section === "adapters" ? hasAdapterSamples(meta.slug) : undefined;
  const template = section.startsWith("guides/") ? "guides/[guide]" : section;
  const sources = prose ? [mdxSource(prose)] : [`${TEMPLATES}/components/[component]/${template}.astro`];
  if (section === "api" || section === "adapters") sources.push(`src/${meta.slug}/`);
  if (section === "adapters") sources.push(`docs/samples/adapters/${meta.slug}/`);
  return {
    path: base.path,
    lang,
    title: base.override ? base.title : (prose?.entry.data.title ?? base.title),
    description: prose?.entry.data.description ?? base.description,
    kind: base.kind,
    stub: generatedComplete !== undefined ? !generatedComplete : !prose || prose.entry.data.draft === true,
    component: meta.slug,
    prose,
    sources,
  };
}

/**
 * Every page through an injected prose lookup, so it runs outside Astro.
 *
 * @param lookup - Finds a docs entry by id (`en/theming`).
 * @param docSlugs - The top-level docs pages; every one must have English prose.
 */
export function buildPages(lookup: (id: string) => DocsEntry | undefined, docSlugs: readonly string[] = DOC_SLUGS): PageInfo[] {
  return LANGS.flatMap((lang): PageInfo[] => [
    { path: "/", lang, title: t(lang, "site.name"), description: t(lang, "site.positioning"), kind: "landing", stub: false, sources: [`${TEMPLATES}/index.astro`, "docs/src/components/landing/"] },
    ...docSlugs.map((slug): PageInfo => {
      const prose = findProse(lang, slug, lookup);
      if (!prose) throw new Error(`No prose for "${slug}": expected src/content/docs/en/${slug}.mdx.`);
      return {
        path: `/${slug}/`,
        lang,
        title: prose.entry.data.title,
        description: docDescription(slug, prose.entry.data.description),
        kind: "doc",
        stub: prose.entry.data.draft === true,
        prose,
        // A page built from data outside its MDX is dated by that data too.
        sources: [mdxSource(prose), ...(DATA_SOURCES[slug] ?? [])],
      };
    }),
    ...COMPONENTS.flatMap((meta) => [
      componentPage(lang, meta, "index", lookup),
      componentPage(lang, meta, "api", lookup),
      componentPage(lang, meta, "adapters", lookup),
      ...meta.guides.map((guide) => componentPage(lang, meta, `guides/${guide.slug}`, lookup)),
    ]),
  ]);
}

let cached: Promise<PageInfo[]> | undefined;

/** Every page of the site, both languages, read from the content collection once per build. */
export function allPages(): Promise<PageInfo[]> {
  cached ??= (async () => {
    const { getCollection } = await import("astro:content");
    const entries = new Map((await getCollection("docs")).map((entry) => [entry.id, entry]));
    return buildPages((id) => entries.get(id));
  })();
  return cached;
}

/** The finished pages: everything but stubs. What the sitemap and the llms files list. */
export async function publishedPages(): Promise<PageInfo[]> {
  return (await allPages()).filter((page) => !page.stub);
}
