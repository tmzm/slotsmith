import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    virtual: "src/virtual.ts",
    styles: "src/styles.css",
  },
  format: ["esm", "cjs"],
  external: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual", "@floating-ui/react-dom"],
  clean: true,
  splitting: true,
  // Every entry renders client components (hooks, context).
  banner: { js: '"use client";' },
});
