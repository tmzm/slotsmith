import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    virtual: "src/virtual.ts",
    // One entry per component, so an app can import exactly the one it uses.
    autocomplete: "src/autocomplete/index.ts",
    "data-table": "src/data-table/index.ts",
    "file-uploader": "src/file-uploader/index.ts",
    // The whole stylesheet, and one per component.
    styles: "src/styles.css",
    "autocomplete.styles": "src/autocomplete/styles.css",
    "data-table.styles": "src/data-table/styles.css",
    "file-uploader.styles": "src/file-uploader/styles.css",
  },
  format: ["esm", "cjs"],
  external: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual", "@floating-ui/react-dom"],
  clean: true,
  splitting: true,
  // Every entry renders client components (hooks, context).
  banner: { js: '"use client";' },
});
