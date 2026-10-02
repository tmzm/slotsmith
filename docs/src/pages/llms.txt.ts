/** `/llms.txt` (llmstxt.org): the finished English pages, linked by kind. */
import type { APIRoute } from "astro";
import { publishedPages } from "@/lib/pages";
import { renderLlms } from "@/lib/seo-files";

export const GET: APIRoute = async () =>
  new Response(renderLlms(await publishedPages()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
