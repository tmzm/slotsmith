import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { SITE } from "./site.config.ts";
import { aliases } from "./aliases.ts";

/**
 * Stylesheets up to this size are inlined into the page instead of linked.
 * The site's own sheets are 6 to 27 KB each and a page links up to eight, so
 * linked they are eight render-blocking requests before first paint. The
 * design-system sheets the adapter demos load (60 KB and up) stay linked.
 */
const INLINE_CSS_LIMIT = 32 * 1024;

export default defineConfig({
  site: SITE.url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [react(), mdx()],
  vite: {
    // Only the shadcn adapter's stylesheet uses Tailwind (samples/adapters/shadcn.css).
    plugins: [tailwindcss()],
    build: {
      // Undefined keeps Vite's default for every other asset type.
      assetsInlineLimit: (file, content) => (file.endsWith(".css") ? content.length <= INLINE_CSS_LIMIT : undefined),
    },
    resolve: {
      alias: aliases,
      dedupe: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
    },
    server: { fs: { allow: [".", ".."] } },
  },
});
