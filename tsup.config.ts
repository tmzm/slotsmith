import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    virtual: "src/data-table/virtual.tsx",
    styles: "src/data-table/styles.css",
  },
  format: ["esm", "cjs"],
  external: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
  clean: true,
  splitting: true,
  // Every entry renders client components (hooks, context).
  banner: { js: '"use client";' },
});
