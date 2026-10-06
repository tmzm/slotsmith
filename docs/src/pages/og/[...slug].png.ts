/**
 * `/og/<page>.png`: the Open Graph image of every page, in both languages
 * (`/og/index.png`, `/og/theming.png`, `/og/ar/components/data-table.png`).
 * Made from the same page list as the sitemap, so each page `Head` links an
 * image for has one; `verify-site` checks the files exist.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { ogSlug, renderOg } from "@/lib/og";
import { allPages, type PageInfo } from "@/lib/pages";
import { SITE } from "../../../site.config.ts";

/** The `{section}` tag: a component page shows its import path, a top-level page `docs`, the landing nothing. */
function section(page: PageInfo): string | null {
  if (page.kind === "landing") return null;
  return page.component ? `${SITE.npm}/${page.component}` : "docs";
}

export const getStaticPaths: GetStaticPaths = async () =>
  (await allPages()).map((page) => ({ params: { slug: ogSlug(page.lang, page.path) }, props: { page } }));

export const GET: APIRoute<{ page: PageInfo }> = async ({ props: { page } }) =>
  new Response(Buffer.from(await renderOg({ title: page.title, section: section(page), lang: page.lang })), {
    headers: { "Content-Type": "image/png" },
  });
