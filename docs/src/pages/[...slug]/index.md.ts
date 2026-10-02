/**
 * `<path>index.md`: every page, in both languages, as Markdown
 * (`/index.md`, `/theming/index.md`, `/ar/theming/index.md`). Head links each
 * page to its copy with `<link rel="alternate" type="text/markdown">`, and the
 * docs header offers it to copy or view. Stubs are included: their copy says
 * the page is being written.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { localePath } from "@/i18n";
import { pageMarkdown } from "@/lib/markdown";
import { allPages, type PageInfo } from "@/lib/pages";

export const getStaticPaths: GetStaticPaths = async () =>
  (await allPages()).map((page) => {
    const slug = localePath(page.lang, page.path).replace(/^\/|\/$/g, "");
    return { params: { slug: slug || undefined }, props: { page } };
  });

export const GET: APIRoute<{ page: PageInfo }> = async ({ props }) =>
  new Response(await pageMarkdown(props.page), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
