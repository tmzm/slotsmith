import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { SITE } from "./site.config.ts";
import { aliases } from "./aliases.ts";

export default defineConfig({
  site: SITE.url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [react(), mdx()],
  vite: {
    // Only the shadcn adapter's stylesheet uses Tailwind (samples/adapters/shadcn.css).
    plugins: [tailwindcss()],
    resolve: {
      alias: aliases,
      dedupe: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
    },
    server: { fs: { allow: [".", ".."] } },
  },
});
