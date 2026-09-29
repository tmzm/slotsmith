import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { SITE } from "./site.config";
import { aliases } from "./aliases";

export default defineConfig({
  site: SITE.url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [react(), mdx()],
  vite: {
    resolve: {
      alias: aliases,
      dedupe: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
    },
    server: { fs: { allow: [".", ".."] } },
  },
});
