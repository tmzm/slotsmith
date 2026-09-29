import { defineConfig } from "vitest/config";
import { aliases } from "./aliases.ts";

export default defineConfig({
  resolve: {
    alias: aliases,
    dedupe: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "scripts/**/__tests__/**/*.test.ts"],
  },
});
