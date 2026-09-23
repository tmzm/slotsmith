import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    /**
     * The suites are quick on their own, but 15 jsdom files (three of them
     * rendering MUI and Chakra) compete for CPU, and the 5s default turns
     * that contention into flakes.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
