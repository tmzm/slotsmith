/** `/sitemap.xml`: every finished page in both languages, with its hreflang alternates. Stubs are left out until they are written. */
import type { APIRoute } from "astro";
import { publishedPages } from "@/lib/pages";
import { renderSitemap } from "@/lib/seo-files";

export const GET: APIRoute = async () =>
  new Response(renderSitemap(await publishedPages()), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
