/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";
import { aliases } from "./aliases.ts";

// Astro's Vite config, so tests can render `.astro` components with the container API.
export default getViteConfig({
  resolve: {
    alias: aliases,
    dedupe: ["react", "react-dom", "@tanstack/react-table", "@tanstack/react-virtual"],
  },
  test: {
    environment: "node",
    // Rendering .astro components cold can take over 5s on a busy machine.
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "samples/**/__tests__/**/*.test.{ts,tsx}", "scripts/**/__tests__/**/*.test.ts"],
  },
});
