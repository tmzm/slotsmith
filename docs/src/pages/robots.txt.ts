/** `/robots.txt`: allows every crawler and names the sitemap. */
import type { APIRoute } from "astro";
import { renderRobots } from "@/lib/seo-files";

export const GET: APIRoute = () => new Response(renderRobots(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
