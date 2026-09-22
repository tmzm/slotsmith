import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    virtual: "src/virtual.tsx",
    styles: "src/styles.css",
  },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts", virtual: "src/virtual.tsx" } },
  external: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
  clean: true,
  treeshake: true,
});
