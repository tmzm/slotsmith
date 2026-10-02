/**
 * `/sitemap.xml`: every finished page in both languages, with its hreflang
 * alternates and, when git has one, its last-modified date. Stubs are left out
 * until they are written.
 */
import type { APIRoute } from "astro";
import { lastModified } from "@/lib/git-dates";
import { publishedPages } from "@/lib/pages";
import { renderSitemap } from "@/lib/seo-files";

export const GET: APIRoute = async () => {
  const pages = (await publishedPages()).map((page) => ({ ...page, lastmod: lastModified(page.sources) ?? undefined }));
  return new Response(renderSitemap(pages), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
