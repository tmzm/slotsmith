/**
 * `/og/<page>.png`: the Open Graph image of every page, in both languages
 * (`/og/index.png`, `/og/theming.png`, `/og/ar/components/data-table.png`).
 * Made from the same page list as the sitemap, so each page `Head` links an
 * image for has one; `verify-site` checks the files exist.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { t } from "@/i18n";
import { ogSlug, renderOg, type OgInput } from "@/lib/og";
import { allPages, type PageInfo } from "@/lib/pages";
import { SITE } from "../../../site.config.ts";

/** The `{section}` tag: a component page shows its import path, a top-level page `docs`. */
function section(page: PageInfo): string {
  return page.component ? `${SITE.npm}/${page.component}` : "docs";
}

/**
 * What a page's image shows. The landing's says what slotsmith is: the hero's
 * sentence up to its colon, with the component names it marks in gold. Every
 * other page shows its title.
 */
function input(page: PageInfo): OgInput {
  if (page.kind === "landing") return { title: t(page.lang, "hero.title").split(":")[0]!, section: null, lang: page.lang, marked: true };
  return { title: page.title, section: section(page), lang: page.lang };
}

export const getStaticPaths: GetStaticPaths = async () =>
  (await allPages()).map((page) => ({ params: { slug: ogSlug(page.lang, page.path) }, props: { page } }));

export const GET: APIRoute<{ page: PageInfo }> = async ({ props: { page } }) =>
  new Response(Buffer.from(await renderOg(input(page))), {
    headers: { "Content-Type": "image/png" },
  });
